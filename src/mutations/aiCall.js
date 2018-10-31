import { ObjectID } from 'mongodb'
const moment = require('moment')
import aiQueue from '../modules/AI/call/queue'

export const addAiCall = async (_, { appointmentId, cdeId, period }) => {
  const appointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })

  if (!appointment) {
    throw new Error('Appointment _id is not existed!')
  }
  const cde = (await db.collection('users').findOne({ _id: cdeId })) || {}
  const cdeName = cde.nickname
  const {
    healthCareTeamId,
    nickname,
    mobile,
    appointmentTime,
    patientId,
  } = appointment
  const { institutionName } =
    (await db
      .collection('healthCareTeams')
      .findOne({ _id: healthCareTeamId })) || {}
  const aiCallRecord = {
    _id: new ObjectID().toString(),
    appointmentId,
    patientId,
    healthCareTeamId,
    nickname,
    mobile,
    appointmentTime,
    period,
    cdeName,
    hospital: institutionName,
    status: 'init',
    callAt: new Date(),
    createdAt: new Date(),
  }
  await db.collection('aiCalls').insertOne(aiCallRecord)
  const timeStamp = moment(appointmentTime)
    .startOf('day')
    .add(period === 'AFTERNOON' ? 14 : 8, 'hours')
    .format('X')

  const bodyData = {
    patient: nickname,
    phoneNumber: mobile,
    hospital: institutionName,
    appointment: timeStamp,
    caregiver: cdeName || '于水清',
    department: '战略合作部',
    callMark: aiCallRecord._id,
  }
  aiQueue.push(bodyData)
  return 'OK'
}
