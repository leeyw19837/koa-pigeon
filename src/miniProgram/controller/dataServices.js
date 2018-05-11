import freshId from 'fresh-id'
const moment = require('moment')

const getCompare = () => {
  return {
    $gte: moment().startOf('day')._d,
    $lt: moment().endOf('day')._d,
  }
}

export const getPatient = async (unionid) => {
  return await db
    .collection('users')
    .findOne({'wechatInfo.unionid': unionid})
}

export const getReview = async (patientId) => {
  return await db
    .collection('rewiews')
    .findOne({
      patientId,
      treatmentTime: getCompare(),
    })
}

export const getTodayAppointment = async (patientId) => {
  const isCurrentTreatment = await db
    .collection('appointments')
    .findOne({
      patientId,
      isOutPatient: true,
      appointmentTime: getCompare(),
    })
  return isCurrentTreatment
}

export const getNextAppointment = async (patientId) => {
  const appointments = await db
    .collection('appointments')
    .find({
      patientId,
      isOutPatient: false,
    }).sort({
      appointments: -1,
    }).toArray()
  return appointments.length ? appointments[appointments.length - 1] : {}
}

export const createReview = async (rewiew) => {
  const content = {
    _id: freshId(),
    ...rewiew,
    createdAt: new Date()
  }
  return await db.collection('rewiews').insertOne(content)
}
