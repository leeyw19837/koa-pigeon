import { ObjectID } from 'mongodb'
import moment from 'moment'

export const getPatient = async (unionid) => {
  return await db
    .collection('users')
    .findOne({'wechatInfo.unionid': unionid})
}

export const getTodayAppointment = async (patientId) => {
  const isCurrentTreatment = await db
    .collection('appointments')
    .findOne({
      patientId,
      isOutPatient: true,
      appointmentTime: {
        $gte: moment().startOf('day')._d,
        $lt: moment().endOf('day')._d
      }
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
