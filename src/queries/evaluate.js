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
  let { selectedDays = [] } = args
  let firstDay = selectedDays ? selectedDays[0] : moment().format('YYYY-MM-DD')
  let secondDay = selectedDays ? selectedDays[1] : undefined
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
    if (desc1 === 'C_OO_NA' || desc2 === 'C_OO_NA') return { power: 0 }
    const group1 = desc1.split('_')
    const group2 = desc2.split('_')
    if (group1[0] !== group2[0]) {
      return { power: 4, group1, group2 }
    } else if (group1[1] !== group2[1]) {
      return { power: 3, group1, group2 }
    } else if (group1[2] !== group2[2]) {
      return { power: 2, group1, group2 }
    }
    return { power: 1, group1, group2 }
  }
  // firstDay = '2018-03-01'
  // secondDay = '2018-03-07'
  let secondResult = []
  let firstResult = []
  let tempFirstResult = []
  let tempSecondResult = []
  if (firstDay) {
    const option = {
      method: 'GET',
      uri: `${Url}evaluate/getAllPatientsCalc/${firstDay}`,
      json: true,
    }
    tempFirstResult = await request(option)
    firstResult = tempFirstResult.filter(item => item.patientState === 'ACTIVE')
  }
  if (secondDay) {
    const option = {
      method: 'GET',
      uri: `${Url}evaluate/getAllPatientsCalc/${secondDay}`,
      json: true,
    }
    tempSecondResult = await request(option)
    secondResult = tempSecondResult.filter(
      item => item.patientState === 'ACTIVE',
    )
  }
  const coming = {
    type: 'Coming',
    data: [],
    diff: [],
    count: secondDay && firstDay ? [0, 0] : [0],
    children: [
      {
        type: 'in',
        data: [],
        diff: [],
        count: secondDay && firstDay ? [0, 0] : [0],
        children: [
          {
            type: 'Less',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
          {
            type: 'GreaterThan',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
        ],
      },
      {
        type: 'out',
        data: [],
        diff: [],
        count: secondDay && firstDay ? [0, 0] : [0],
        children: [
          {
            type: 'First',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
          {
            type: 'Return',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
        ],
      },
    ],
  }
  const waiting = {
    type: 'Waiting',
    data: [],
    diff: [],
    count: secondDay && firstDay ? [0, 0] : [0],
    children: [
      {
        type: 'in',
        data: [],
        diff: [],
        count: secondDay && firstDay ? [0, 0] : [0],
        children: [
          {
            type: 'Less',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
          {
            type: 'GreaterThan',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
        ],
      },
      {
        type: 'out',
        data: [],
        diff: [],
        count: secondDay && firstDay ? [0, 0] : [0],
        children: [
          {
            type: 'First',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
          {
            type: 'Return',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
        ],
      },
    ],
  }
  const flexable = {
    type: 'Flexable',
    data: [],
    diff: [],
    count: secondDay && firstDay ? [0, 0] : [0],
    children: [
      {
        type: 'in',
        data: [],
        diff: [],
        count: secondDay && firstDay ? [0, 0] : [0],
        children: [
          {
            type: 'Less',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
          {
            type: 'GreaterThan',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
        ],
      },
      {
        type: 'out',
        data: [],
        diff: [],
        count: secondDay && firstDay ? [0, 0] : [0],
        children: [
          {
            type: 'First',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
          {
            type: 'Return',
            count: secondDay && firstDay ? [0, 0] : [0],
            diff: [],
            children: [
              {
                type: 'A',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'B',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'C',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'D',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
              {
                type: 'E',
                count: secondDay && firstDay ? [0, 0] : [0],
                diff: [],
              },
            ],
          },
        ],
      },
    ],
  }
  const outOut = {
    type: 'OutOut',
    count: secondDay && firstDay ? [0, 0] : [0],
    diff: [],
    children: [
      { type: 'A', count: secondDay && firstDay ? [0, 0] : [0], diff: [] },
      { type: 'B', count: secondDay && firstDay ? [0, 0] : [0], diff: [] },
      { type: 'C', count: secondDay && firstDay ? [0, 0] : [0], diff: [] },
      { type: 'D', count: secondDay && firstDay ? [0, 0] : [0], diff: [] },
      { type: 'E', count: secondDay && firstDay ? [0, 0] : [0], diff: [] },
    ],
  }
  const calData = {
    type: 'All',
    count: secondDay && firstDay ? [0, 0] : [0],
    data: [],
    diff: [],
    children: [outOut, coming, flexable, waiting],
  }
  const pushData = (arr1, position1, position2, type, returnResult) => {
    calData.children[arr1].count[returnResult] += 1
    calData.children[arr1].children[position1].count[returnResult] += 1
    calData.children[arr1].children[position1].children[position2].count[
      returnResult
    ] += 1
    calData.children[arr1].children[position1].children[position2].children[
      type
    ].count[returnResult] += 1
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
  const pushDiff = (diffType, AEType1, AEType2, change) => {
    const item1_group = getGroup(diffType.group1[0])
    const item2_group = getGroup(diffType.group2[0])
    const item1children1 = diffType.group1[1] === 'in' ? 0 : 1
    const item1children2 =
      diffType.group1[2] === 'L' || diffType.group1[2] === 'F' ? 0 : 1
    const item2children1 = diffType.group2[1] === 'in' ? 0 : 1
    const item2children2 =
      diffType.group2[2] === 'L' || diffType.group2[2] === 'F' ? 0 : 1
    pushDiffData(
      diffType.power,
      item1_group,
      item1children1,
      item1children2,
      AEType1,
      change,
    )
    pushDiffData(
      diffType.power,
      item2_group,
      item2children1,
      item2children2,
      AEType2,
      change,
    )
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

  if (firstResult.length > 0 && secondResult.length === 0) {
    setCount(firstResult, 0)
    calData.data = firstResult
  } else if (firstResult.length > 0 && secondResult.length > 0) {
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
        if (DiffType.power === 0) {
          let treeLocation = []
          let treeType = 0
          let treeTypeOhter = 0
          if (
            item.flag[0].desc === 'C_OO_NA' &&
            Arr2Item.flag[0].desc !== 'C_OO_NA'
          ) {
            treeLocation = Arr2Item.flag[0].desc.split('_')
            treeType = firstType
            treeTypeOhter = secondType
          } else if (
            item.flag[0].desc !== 'C_OO_NA' &&
            Arr2Item.flag[0].desc === 'C_OO_NA'
          ) {
            treeLocation = item.flag[0].desc.split('_')
            treeType = secondType
            treeTypeOhter = firstType
          }
          if (treeLocation.length > 0) {
            const children1 = treeLocation[1] === 'in' ? 0 : 1
            const children2 =
              treeLocation[2] === 'L' || treeLocation[2] === 'F' ? 0 : 1
            const item1_group = getGroup(treeLocation[0])
            pushDiffData(
              4,
              getGroup(treeLocation[0]),
              children1,
              children2,
              treeTypeOhter,
              change,
            )
            calData.children[0].diff.push(change)
            calData.children[0].children[treeType].diff.push(change)
          } else {
            calData.children[0].children[firstType].diff.push(change)
            calData.children[0].children[secondType].diff.push(change)
          }
          const temp = Arr2Item
          temp.rangeChange = `${item.flag[0].desc}->${Arr2Item.flag[0].desc}`
          temp.a1cChange = `${item.a1cLatest}->${Arr2Item.a1cLatest}`
          temp.measureChange = `${item.measureCount}->${Arr2Item.measureCount}`
          calData.data.push(temp)
        } else {
          pushDiff(DiffType, firstType, secondType, change)
          const temp = Arr2Item
          temp.rangeChange = `${item.flag[0].desc}->${Arr2Item.flag[0].desc}`
          temp.a1cChange = `${item.a1cLatest}->${Arr2Item.a1cLatest}`
          temp.measureChange = `${item.measureCount}->${Arr2Item.measureCount}`
          calData.data.push(temp)
        }
      }
    })
    diff.map(item => {
      const inAfter = find(secondResult, { patientId: item.patientId })
      const isArchived = find(tempFirstResult, {
        patientId: item.patientId,
        patientState: 'ARCHIVED',
      })
      const temp = inAfter
      if (inAfter) {
        if (isArchived) {
          temp.rangeChange = `${isArchived.flag[0].desc}->${inAfter.flag[0]
            .desc}`
          temp.a1cChange = `${isArchived.a1cLatest}->${inAfter.a1cLatest}`
          temp.measureChange = `${isArchived.measureCount}->${inAfter.measureCount}`
          calData.data.push(temp)
          calData.diff.push({
            patientId: item.patientId,
            move: `ARCHIVED->${item.flag[0].desc}_${item.category.split(
              '',
            )[0]}`,
          })
        } else {
          temp.rangeChange = `无->${inAfter.flag[0].desc}`
          temp.a1cChange = `无->${inAfter.a1cLatest}`
          temp.measureChange = `无->${inAfter.measureCount}`
          calData.data.push(temp)
          calData.diff.push({
            patientId: item.patientId,
            move: `First->${item.flag[0].desc}_${item.category.split('')[0]}`,
          })
        }
      } else {
        calData.diff.push({
          patientId: item.patientId,
          move: `${item.flag[0].desc}_${item.category.split('')[0]}->ARCHIVED`,
        })
        const inBefore = find(firstResult, { patientId: item.patientId })
        inBefore.rangeChange = `${inAfter.flag[0].desc}->无`
        inBefore.a1cChange = `${inAfter.a1cLatest}->无`
        inBefore.measureChange = `${inAfter.measureCount}->无`
        calData.data.push(inBefore)
      }
    })
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
    uri: `http://172.16.0.92:9901/evaluate/getDiffPatients/${startAt}~${endAt}`,
    json: true,
  }
  const result = await request(options)
  // console.log(result)
  return result
}
