import { ObjectID } from 'mongodb'

import { orderBy } from 'lodash'
import moment from 'moment'

export const patient = async (_, args, { getDb }) => {
  const db = await getDb()
  if (args.patientId) {
    return db.collection('users').findOne({
      _id: ObjectID.createFromHexString(args.patientId),
      patientState: { $exists: 1 },
    })
  } else if (args.telephone) {
    return db.collection('users').findOne({
      username: { $regex: args.telephone },
      patientState: { $exists: 1 },
    })
  }
  return null
}

export const patients = async (_, { cdeId }, { getDb }) => {
  const db = await getDb()
  const condition = {
    patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
    roles: { $exists: 0 },
  }
  if (cdeId) condition.cdeId = cdeId
  return db
    .collection('users')
    .find(condition)
    .toArray()
}

export const patientsByStatus = async (_, args, { getDb }) => {
  const db = await getDb()
  return db
    .collection('users')
    .find({ status: args.status })
    .toArray()
}

export const healthCareProfessional = async (_, args, { getDb }) => {
  const db = await getDb()
  return db
    .collection('users')
    .findOne({ _id: args.id, patientState: { $exists: 0 } })
}

export const healthCareProfessionals = async (_, args, { getDb }) => {
  const db = await getDb()
  return db
    .collection('users')
    .find({ patientState: { $exists: 0 } })
    .toArray()
}

export const latestCaseRecordBeforeDate = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId, now } = args
  const cr = await db
    .collection('caseRecord')
    .find({ patientId, createdAt: { $lt: now } })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray()
  if (!!cr.length) return cr[0]
  return null
}

export const appointmentsInformation = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId } = args
  const result = {
    patientId,
    preAppointmentsCount: 0, // 历史门诊次数
    nextAppointmentCount: 1, // 下次门诊次数
    nextAppointmentDate: '', // 下次门诊日期
    nextAppointmentDays: '', // 下次门诊还剩几天
  }
  // 当前患者的所有预约信息, 时间倒叙
  const appointments = await db
    .collection('appointments')
    .find({
      patientId,
    })
    .sort({ appointmentTime: -1 })
    .toArray()

  // 下次门诊时间/下次门诊次数/下次门诊还剩几天
  const preAppointments = appointments.filter(a => {
    // 所有签了到的门诊, 用来计算历史门诊次数
    return a.isOutPatient === true
  })
  result.preAppointmentsCount = preAppointments.length
  result.nextAppointmentCount = result.preAppointmentsCount + 1

  const nextAppointment = orderBy(
    // 未签到的, 今天或今天之后的第一次门诊
    appointments.filter(a => {
      return (
        a.isOutPatient === false &&
        moment(a.appointmentTime) >= moment().startOf('day')
      )
    }),
    ['appointmentTime'],
    ['asc'],
  )
  if (nextAppointment && nextAppointment.length > 0) {
    result.nextAppointmentDate = moment(
      nextAppointment[0].appointmentTime,
    ).format('YYYY-MM-DD')
    result.nextAppointmentDays = moment(nextAppointment[0].appointmentTime)
      .diff(new Date(), 'days')
      .toString()
  }
  return result
}
