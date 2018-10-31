import findIndex from 'lodash/findIndex'
import moment from 'moment'

import aiQueues from './queue'
import { dealWithJob } from './consumer'

export const registerAiCalls = async () => {
  const isValidJob = job => moment().isBefore(moment.unix(job.appointment))

  const aiCallOption = {
    currentJobs: [],
    maxConsumers: 1,
  }

  const deleteJob = jobId => {
    const { currentJobs } = aiCallOption
    const jobIndex = findIndex(currentJobs, o => o._id === jobId)
    if (jobIndex !== -1) {
      aiCallOption.currentJobs.splice(jobIndex, 1)
    }
  }

  const handleJob = async () => {
    const { currentJobs, maxConsumers } = aiCallOption
    if (currentJobs.length < maxConsumers) {
      const job = aiQueues.pop()
      console.log(job && job._id, '@job')
      if (job) {
        if (isValidJob(job)) {
          aiCallOption.currentJobs.push(job)
          const flag = await dealWithJob(job)
          console.log(flag, '~~~flag')
          if (!flag) {
            deleteJob(job._id)
            await handleJob()
          }
        } else {
          await handleJob()
        }
      }
    } else {
      console.log('please wait')
    }
  }

  // console.log('register job')
  // emitter.on('add.consumer.job', async () => {
  //   console.log('add.consumer.job', '~~~')
  //   await handleJob()
  // })

  PigeonEmitter.on('add.consumer.job', async () => {
    await handleJob()
  })

  PigeonEmitter.on('finish.job', async jobId => {
    deleteJob(jobId)
    await handleJob()
  })

  await aiQueues.initJobs()
}
