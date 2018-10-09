import { ObjectID } from 'mongodb'
import request from 'request-promise'
import moment from 'moment'
import get from 'lodash/get'

const AI_CALL_HOST =
  process.env.AI_CALL_HOST || 'http://120.92.117.210:8093/api'

const aiCall = async bodyData => {
  let result = {}
  try {
    const options = {
      method: 'POST',
      uri: `${AI_CALL_HOST}/createJob`,
      body: bodyData,
      json: true,
    }
    const res = await request(options)
    result = res
  } catch (e) {
    result = { errCode: 400 }
  }
  return result
}

export const callAppointmentById = async ({ appointmentId, cdeId, period }) => {
  const appointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })

  if (!appointment) {
    throw new Error('Appointment _id is not existed!')
  }
  const cde = (await db.collection('users').findOne({ _id: cdeId })) || {}
  const cdeName = cde.nickname
  const { healthCareTeamId, nickname, mobile, appointmentTime } = appointment
  const { institutionName } =
    (await db
      .collection('healthCareTeams')
      .findOne({ _id: healthCareTeamId })) || {}
  const aiCallRecord = {
    _id: new ObjectID().toString(),
    appointmentId,
    nickname,
    mobile,
    appointmentTime,
    period,
    status: 'dialing',
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

  const result = await aiCall(bodyData)
  const voiceCode = !result.errCode || get(result, 'data.voiceCode')
  await db.collection('aiCalls').update(
    {
      _id: aiCallRecord._id,
    },
    {
      $set: {
        status: voiceCode ? 'dialing' : 'fail',
        updatedAt: new Date(),
      },
    },
  )
  return {
    voiceResult: get(result, 'data.voiceResult') || 'ai wrong',
    voiceCode,
  }
}

export const aiCallNotify = async (data = {}) => {
  const { talkInfo, state, callMark } = data
  await db.collection('aiCalls').update(
    {
      _id: callMark,
    },
    {
      $set: {
        status: state ? 'success' : 'fail',
        talkInfo,
        updatedAt: new Date(),
      },
    },
  )
}
