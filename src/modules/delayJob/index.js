const jobs = new Map()

export const delDelayJob = id => {
  if (isJobExists(id)) {
    clearTimeout(jobs.get(id).timeout)
    jobs.delete(id)
  }
}

export const isJobExists = id => {
  return jobs.has(id)
}

export const setDelayJob = (id, job, sec) => {
  delDelayJob(id)
  const timeout = setTimeout(() => {
    job()
    delDelayJob(id)
  }, sec * 1000)
  const startAt = new Date()
  jobs.set(id, { timeout, startAt, delay: sec })
}

export const resetJobs = () => {
  jobs.forEach((job, id) => {
    delDelayJob(id)
  })
}

export const getAllJobs = () => jobs
