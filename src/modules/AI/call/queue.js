import findIndex from 'lodash/findIndex'
import { getInitAiCalls } from './api'
import { transforJob } from './utils'

class Queue {
  constructor(initJobs) {
    this.queues = []
    this.initFn = initJobs
  }
  async initJobs() {
    console.log(' ~~~ initJobs ~~~ ')
    if (this.initFn) {
      const jobs = await this.initFn()
      jobs.forEach(job => this.push(transforJob(job)))
    }
  }

  push(job) {
    this.queues.push({
      _id: job.callMark,
      ...job,
    })
    PigeonEmitter.emit('add.consumer.job')
  }

  pop() {
    return this.queues.pop()
  }

  getLatestJob() {
    return this.queues.length ? this.queues[this.queues.length - 1] : null
  }

  removeById(jobId) {
    const jobIndex = findIndex(this.queues, o => o._id === jobId)
    if (jobIndex > -1) this.queues.splice(jobIndex, 1)
  }
  removeAll() {
    this.queues = []
  }
}

const aiCallQueues = new Queue(getInitAiCalls)

export default aiCallQueues
