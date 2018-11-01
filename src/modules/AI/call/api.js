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
    const options = {
      method: 'POST',
      uri: `${AI_CALL_HOST}/createJob`,
      body: bodyData,
      json: true,
    }
    request(options)
      .then(({ data }) => {
        if (data.voiceCode) {
          resolve(true)
        } else {
          reject(false)
        }
      })
      .catch(e => {
        reject(false)
      })
  })

export const updateAiJob = async ({ jobId, flag }) => {
  const $setObj = {
    status: flag ? 'dialing' : 'fail',
    updatedAt: new Date(),
  }
  if (!flag) {
    $setObj.failReason = 'AI电话未拨通！'
  }

  await db.collection('aiCalls').update({ _id: jobId }, { $set: $setObj })
}

export const aiCallNotify = async (data = {}) => {
  const { talkInfo, state, callMark } = data
  const $setObj = {
    status: state ? 'success' : 'fail',
    talkInfo: talkInfo || [],
    updatedAt: new Date(),
  }
  if (!state) {
    $setObj.failReason = 'AI电话无人接听, 占线, 或者拒接！'
  }
  await db.collection('aiCalls').update({ _id: callMark }, { $set: $setObj })
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
