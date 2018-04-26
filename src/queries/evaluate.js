import { ObjectId } from 'mongodb'
const moment = require('moment')
const request = require('request-promise')
const pick = require('lodash/pick')
const find = require('lodash/find')
const xorBy = require('lodash/xorBy')
const intersectionBy = require('lodash/intersectionBy')

const URi = 'http://workwechat.ihealthcn.com/'
const Url = 'http://172.16.0.92:9901/'

export const fetchEvaluate = async (_, args, context) => {
  const db = await context.getDb()
  const { selectedDay = '2018-02-09' } = args
  const startAt = moment(selectedDay)
    .startOf('day')
    .subtract(8, 'h')._d
  const endAt = moment(selectedDay)
    .endOf('day')
    .subtract(8, 'h')._d
  const appointments = await db
    .collection('appointments')
    .find({
      appointmentTime: {
        $gt: startAt,
        $lt: endAt,
      },
      type: { $nin: ['addition', 'first'] },
    })
    .toArray()
  const patientsId = appointments.map(o => o.patientId)
  if (appointments.length) {
    const optionInAdvance = {
      method: 'POST',
      uri: `${URi}analysis/patients`,
      json: true,
      body: {
        userId: patientsId.join(','),
      },
    }
    const results = await request(optionInAdvance)
    const keyNames = [
      '_id',
      'patientId',
      'nickname',
      'category',
      'inValue',
      'a1cForecast',
      'a1cLatest',
      'measureCount',
      'doctors',
      'nextConsultationMin',
      'nextConsultationMax',
    ]

    return results.filter(p => p.patientState == 'ACTIVE').map(detail => ({
      ...pick(detail, keyNames),
    }))
  }
}

export const getPatientsFlag = async (_, args, context) => {
  const { selectedDay = '2018-02-28' } = args
  const optionInAdvance = {
    method: 'POST',
    uri: `${URi}analysis/patients`,
    json: true,
    body: {
      createdAt: selectedDay,
    },
  }
  const results = await request(optionInAdvance)
  const keyNames = ['nickname', 'flag', 'category']
  return results.filter(p => p.patientState == 'ACTIVE').map(detail => ({
    ...pick(detail, keyNames),
  }))
}

export const getOrderedDays = async (_, args, context) => {
  const db = await context.getDb()
  const appointments = await db
    .collection('appointments')
    .aggregate([
      {
        $match: {
          appointmentTime: {
            $ne: null,
            $gte: moment().startOf('day')._d,
            $lt: moment('2018-04-01').endOf('day')._d,
          },
          patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
          isOutPatient: false,
        },
      },
      {
        $project: {
          appointmentTime: 1,
        },
      },
      {
        $group: {
          _id: '$appointmentTime',
          date: { $first: '$appointmentTime' },
        },
      },
    ])
    .toArray()
  const allSelecteDates = []
  // console.log(appointments, '@appointments')
  appointments.forEach(o => {
    const day = moment(o.date).format('YYYY-MM-DD')
    if (allSelecteDates.indexOf(day) === -1) {
      allSelecteDates.push(day)
    }
  })
  return allSelecteDates
}

export const getAllPatientsForCalc = async (_, args, context) => {
  const db = await context.getDb()
  let { selectedDays = [], HospitalAndName = [] } = args
  let firstDay = selectedDays ? selectedDays[0] : moment().format('YYYY-MM-DD')
  let secondDay = selectedDays ? selectedDays[1] : undefined
  let hospitalName = '北大医院'
  let doctorName = '李昂'
  if (HospitalAndName && HospitalAndName.length === 2) {
    hospitalName = HospitalAndName[0]
    doctorName = HospitalAndName[1]
  }
  if (firstDay && secondDay) {
    if (moment(firstDay).isAfter(secondDay)) {
      let temp = secondDay
      secondDay = firstDay
      firstDay = temp
    }
  }
  const getType = category => {
    if (category.indexOf('A') > -1) return 0
    else if (category.indexOf('B') > -1) return 1
    else if (category.indexOf('C') > -1) return 2
    else if (category.indexOf('D') > -1) return 3
    else if (category.indexOf('E') > -1) return 4
    else return -1
  }
  const getGroup = group => {
    if (group === 'C') {
      return 1
    } else if (group === 'W') {
      return 3
    } else if (group === 'F') {
      return 2
    }
    return -1
  }
  const getDiffType = (desc1, desc2) => {
    if (desc1 === 'C_OO_NA' && desc2 === 'C_OO_NA') return { power: 0, type: 1 }
    else if (desc1 === 'C_OO_NA' && desc2 !== 'C_OO_NA')
      return { power: 0, type: 2 }
    else if (desc1 !== 'C_OO_NA' && desc2 === 'C_OO_NA')
      return { power: 0, type: 3 }
    const group1 = desc1.split('_')
    const group2 = desc2.split('_')
    if (group1[0] !== group2[0]) {
      return { power: 4, desc1, desc2 }
    } else if (group1[1] !== group2[1]) {
      return { power: 3, desc1, desc2 }
    } else if (group1[2] !== group2[2]) {
      return { power: 2, desc1, desc2 }
    }
    return { power: 1, desc1, desc2 }
  }
  let secondResult = []
  let firstResult = []
  let tempFirstResult = []
  let tempSecondResult = []
  if (firstDay) {
    const option = {
      method: 'POST',
      uri: `${URi}evaluate/getAllPatientsCalc`,
      json: true,
      body: {
        selectedDay: firstDay,
        hospitalName,
        doctorName,
      },
    }
    tempFirstResult = await request(option)
    firstResult = tempFirstResult
      ? tempFirstResult.filter(item => item.patientState === 'ACTIVE')
      : []
    // console.log(firstResult.length)
  }
  if (secondDay) {
    const option = {
      method: 'POST',
      uri: `${URi}evaluate/getAllPatientsCalc`,
      json: true,
      body: {
        selectedDay: secondDay,
        hospitalName,
        doctorName,
      },
    }
    tempSecondResult = await request(option)
    secondResult = tempSecondResult
      ? tempSecondResult.filter(item => item.patientState === 'ACTIVE')
      : []
    // console.log(secondResult.length)
  }
  const isNeedDiff = secondDay && firstDay
  const firstLivelChildren = type => {
    return {
      type,
      count: isNeedDiff ? [0, 0] : [0],
      diff: [],
    }
  }

  const secondLevelChildren = (type, children) => {
    return {
      type,
      count: isNeedDiff ? [0, 0] : [0],
      diff: [],
      children,
    }
  }
  const firstLivelChildrenGroup = () => [
    firstLivelChildren('A'),
    firstLivelChildren('B'),
    firstLivelChildren('C'),
    firstLivelChildren('D'),
    firstLivelChildren('E'),
  ]
  const secondLevelChildrenGroupIn = () => [
    secondLevelChildren('Less', firstLivelChildrenGroup()),
    secondLevelChildren('GreaterThan', firstLivelChildrenGroup()),
  ]
  const secondLevelChildrenGroupOut = () => [
    secondLevelChildren('First', firstLivelChildrenGroup()),
    secondLevelChildren('Return', firstLivelChildrenGroup()),
  ]
  const thirdLevelChildrenGroup = () => [
    secondLevelChildren('in', secondLevelChildrenGroupIn()),
    secondLevelChildren('out', secondLevelChildrenGroupOut()),
  ]
  const coming = secondLevelChildren('Coming', thirdLevelChildrenGroup())
  const waiting = secondLevelChildren('Waiting', thirdLevelChildrenGroup())
  const flexable = secondLevelChildren('Flexable', thirdLevelChildrenGroup())
  const outOut = secondLevelChildren('OutOut', firstLivelChildrenGroup())
  const calData = {
    type: 'All',
    count: isNeedDiff ? [0, 0] : [0],
    data: [],
    diff: [],
    children: [outOut, coming, flexable, waiting],
  }
  const pushData = (arr1, position1, position2, type, returnResult) => {
    if (arr1 && returnResult) {
      calData.children[arr1].count[returnResult] += 1
      if (position1 && position2) {
        calData.children[arr1].children[position1].count[returnResult] += 1
        calData.children[arr1].children[position1].children[position2].count[
          returnResult
        ] += 1
        if (type) {
          calData.children[arr1].children[position1].children[
            position2
          ].children[type].count[returnResult] += 1
        }
      }
    }
  }
  const pushDiffData = (power, arr1, position1, position2, type, change) => {
    if (power >= 4) calData.children[arr1].diff.push(change)
    if (power >= 3) calData.children[arr1].children[position1].diff.push(change)
    if (power >= 2)
      calData.children[arr1].children[position1].children[position2].diff.push(
        change,
      )
    if (power >= 1)
      calData.children[arr1].children[position1].children[position2].children[
        type
      ].diff.push(change)
  }

  const pushDiffFormat = (power, desc, type, change) => {
    const group = desc.split('_')
    const firstLevel = group[1] === 'in' ? 0 : 1
    const secondLevel = group[2] === 'L' || group[2] === 'F' ? 0 : 1
    pushDiffData(
      power,
      getGroup(group[0]),
      firstLevel,
      secondLevel,
      getType(type),
      change,
    )
  }

  const pushDiff = (diffType, AEType1, AEType2, change) => {
    pushDiffFormat(diffType.power, diffType.desc1, AEType1, change)
    pushDiffFormat(diffType.power, diffType.desc2, AEType2, change)
  }

  const setCount = (result, order) => {
    result.map(item => {
      const group = item.flag[0].desc.split('_')
      const children1 = group[1] === 'in' ? 0 : 1
      const children2 = group[2] === 'L' || group[2] === 'F' ? 0 : 1
      const typeAtoE = getType(item.category)
      if (item.flag[0].desc === 'C_OO_NA') {
        calData.children[0].count[order] += 1
        calData.children[0].children[typeAtoE].count[order] += 1
      } else {
        pushData(getGroup(group[0]), children1, children2, typeAtoE, order)
      }
    })
    calData.count[order] = result.length
  }
  const setChangeRange = (item1, item2) => {
    const temp = item2 || item1
    temp.rangeChange = `${item1 ? item1.flag[0].desc : '无'} -> ${item2
      ? item2.flag[0].desc
      : '无'}`
    temp.a1cChange = `${item1 ? item1.a1cLatest : '无'} -> ${item2
      ? item2.a1cLatest
      : '无'}`
    temp.measureChange = `${item1 ? item1.measureCount : '无'} -> ${item2
      ? item2.measureCount
      : '无'}`
    temp.categoryChange = `${item1 ? item1.category : '无'} -> ${item2
      ? item2.category
      : '无'}`
    return temp
  }

  if (secondResult.length > 0 && firstResult.length > 0) {
    setCount(firstResult, 0)
    setCount(secondResult, 1)
    const diff = xorBy(firstResult, secondResult, 'patientId')
    const same = intersectionBy(firstResult, secondResult, 'patientId')
    const diffSourceData = []
    same.map(item => {
      const Arr2Item = find(secondResult, { patientId: item.patientId })
      const firstType = getType(item.category)
      const secondType = getType(Arr2Item.category)
      if (
        item.flag[0].desc !== Arr2Item.flag[0].desc ||
        firstType !== secondType
      ) {
        const change = {
          patientId: item.patientId,
          move: `${item.flag[0].desc}_${item.category.split('')[0]}->${Arr2Item
            .flag[0].desc}_${Arr2Item.category.split('')[0]}`,
        }
        const DiffType = getDiffType(item.flag[0].desc, Arr2Item.flag[0].desc)
        calData.data.push(setChangeRange(item, Arr2Item))
        if (DiffType.power === 0) {
          if (DiffType.type === 1) {
            calData.children[0].children[firstType].diff.push(change)
            calData.children[0].children[secondType].diff.push(change)
          } else {
            const notOOItem = DiffType.type === 2 ? Arr2Item : item
            const OOitemType = DiffType.type === 2 ? firstType : secondType
            pushDiffFormat(
              4,
              notOOItem.flag[0].desc,
              notOOItem.category,
              change,
            )
            calData.children[0].diff.push(change)
            calData.children[0].children[OOitemType].diff.push(change)
          }
        } else {
          pushDiff(DiffType, item.category, Arr2Item.category, change)
        }
      }
    })

    diff.map(item => {
      const inAfter = find(secondResult, { patientId: item.patientId })
      const isArchived = find(tempFirstResult, {
        patientId: item.patientId,
        patientState: 'ARCHIVED',
      })
      if (inAfter) {
        const change = {
          patientId: item.patientId,
          move: `${isArchived ? 'ARCHIVED' : 'First'} -> ${item.flag[0]
            .desc}_${item.category.split('')[0]}`,
        }
        pushDiffFormat(4, inAfter.flag[0].desc, inAfter.category, change)
        calData.data.push(setChangeRange(isArchived, inAfter))
        calData.diff.push(change)
      } else {
        const inBefore = find(firstResult, { patientId: item.patientId })
        const change = {
          patientId: item.patientId,
          move: `${item.flag[0].desc}_${item.category.split(
            '',
          )[0]} -> ARCHIVED`,
        }
        pushDiffFormat(4, inBefore.flag[0].desc, inBefore.category, change)
        calData.diff.push(change)
        calData.data.push(setChangeRange(inBefore, null))
      }
    })
  } else if (firstResult.length > 0) {
    setCount(firstResult, 0)
    calData.data = firstResult
  }
  return calData
}

export const fetchForecaseDetail = async (_, args, context) => {
  const db = await context.getDb()
  const { selectedDay = '2018-03-31' } = args
  // const options = {
  //   method: 'GET',
  //   uri: `${URi}evaluate/getForecaseDetail/${selectedDay}`,
  //   // uri: 'http://127.0.0.1:9901/evaluate/getForecaseDetail/2018-02-13',
  //   json: true,
  // }
  const optionInNew = {
    method: 'GET',
    uri: `${URi}evaluate/getNewForecaseDetail/${selectedDay}`,
    json: true,
  }
  // const keyNames = [
  //   'inValue', 'a1cGood',
  //   'a1cGoodPercent', 'activePatient',
  // ]
  const result = await request(optionInNew)
  return {
    ...result,
    // actualDay: new Date(result.actualDay),
  }
}

export const fetchMgtPatients = async (_, args, context) => {
  const db = await context.getDb()
  const { startAt, endAt } = args
  const options = {
    method: 'GET',
    // uri: `http://172.16.0.62:9901/evaluate/getDiffPatients/${startAt}~${endAt}`
    uri: `${URi}evaluate/getDiffPatients/${startAt}~${endAt}`,
    json: true,
  }
  const result = await request(options)
  // console.log(result)
  return result
}
