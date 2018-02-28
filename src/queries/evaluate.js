import { ObjectId } from 'mongodb'
const moment = require('moment')
const request = require('request-promise')
const pick = require('lodash/pick')

const URi = 'http://workwechat.ihealthcn.com/'

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
  const keyNames = [
    'nickname',
    'flag',
    'category',
  ]
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
  console.log(result)
  return result
}
