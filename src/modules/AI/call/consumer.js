import omit from 'lodash/omit'
import moment from 'moment'

import { retry } from './utils'
import { aiCall, updateAiJob } from './api'

/**
 * 如果在下午五点之后添加的job，就不能再打电话出去了
 * @param {*} job
 */
export const dealWithJob = async job => {
  const deadLine = moment()
    .startOf('day')
    .add(17, 'hours')

  if (moment().isAfter(deadLine)) return false

  const jobId = job._id
  const tempJob = omit(job, '_id')
  const call = () => aiCall(tempJob)

  const retryCounts = 3
  const timeout = 1000 * 10

  let callFlag = false
  try {
    callFlag = await retry(call, retryCounts, timeout)
  } catch (error) {
    console.log(error)
  }
  await updateAiJob({ jobId, flag: callFlag })
  return callFlag
}
