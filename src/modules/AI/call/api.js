import { ObjectID } from 'mongodb'
import request from 'request-promise'
import moment from 'moment'
import get from 'lodash/get'

const events = require('events')
const emitter = new events.EventEmitter()

const AI_CALL_HOST =
  process.env.AI_CALL_HOST || 'http://120.92.117.210:8093/api'

export const aiCall = bodyData =>
  new Promise((resolve, reject) => {
    console.log('aicall')
    const options = {
      method: 'POST',
      uri: `${AI_CALL_HOST}/createJob`,
      body: bodyData,
      json: true,
    }
    request(options)
      .then(({ data }) => {
        console.log(data, '@data')
        if (data.voiceCode) {
          resolve(true)
        } else {
          reject(false)
        }
      })
      .catch(e => {
        console.log(e, '~~~~~')
        reject(false)
      })
  })

export const updateAiJob = async ({ jobId, flag }) => {
  await db.collection('aiCalls').update(
    { _id: jobId },
    {
      $set: {
        status: flag ? 'dialing' : 'fail',
        updatedAt: new Date(),
      },
    },
  )
}

export const aiCallNotify = async (data = {}) => {
  const { talkInfo, state, callMark } = data
  const info = state
    ? talkInfo
    : {
        recordTime: new Date(),
        ask: '',
        answer: '电话无人接听, 占线, 或者拒接！',
      }
  await db.collection('aiCalls').update(
    { _id: callMark },
    {
      $set: {
        status: state ? 'success' : 'fail',
        talkInfo: info,
        updatedAt: new Date(),
      },
    },
  )
  emitter.emit('finish.job', callMark)
}

export const getInitAiCalls = async () => {
  const startAt = moment().startOf('day')._d
  const initJobs = await db
    .collection('aiCalls')
    .find({
      appointmentTime: { $gte: startAt },
      callAt: { $gt: startAt },
      status: 'init',
    })
    .sort({ createdAt: 1 })
    .toArray()
  return initJobs
}
