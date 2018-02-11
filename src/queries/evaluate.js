import { ObjectId } from 'mongodb'
const moment = require('moment')
const request = require('request-promise')
const pick = require('lodash/pick')

const URi = 'http://workwechat.ihealthcn.com/'

export const fetchEvaluate = async (_, args, context) => {
  const db = await context.getDb()
  const { selectedDay = '2018-02-09' } = args
  const startAt = moment(selectedDay).startOf('day').subtract(8, 'h')._d
  const endAt = moment(selectedDay).endOf('day').subtract(8, 'h')._d
  const appointments = await db.collection('appointments').find({
    appointmentTime: {
      $gt: startAt,
      $lt: endAt,
    }
  }).toArray()
  const patientsId = appointments.map(o => o.patientId)
  if (appointments.length) {
    // const options = {
    //   method: 'GET',
    //   uri: `${URi}evaluate/getPatientDetail/${selectedDay}`,
    //   json: true,
    // }

    const optionInAdvance = {
      method: 'POST',
      uri: `${URi}analysis/patients`,
      json: true,
      body: {
        userId: patientsId.join(','),
      }
    }
    const results = await request(optionInAdvance)
    const keyNames = [
      '_id', 'nickname', 'category', 'inValue',
      'a1cForecast', 'a1cLatest', 'measureCount',
      'doctors', 'nextConsultationMin', 'nextConsultationMax'
    ]
    return results.map(detail => ({
      ...pick(detail, keyNames),
    }))
  }
}

export const getOrderedDays = async (_, args, context) => {
  const db = await context.getDb()
  const appointments = await db.collection('appointments').aggregate([
    {
      $match: {
        appointmentTime: {
          $ne: null,
          $gte: moment().startOf('day')._d,
          $lt: moment('2018-04-01').endOf('day')._d
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
  ]).toArray()
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
