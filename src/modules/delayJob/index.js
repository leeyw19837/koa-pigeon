const jobs = {}

export const delDelayJob = id => {
  clearTimeout(jobs[id])
  delete jobs[id]
}

export const isJobExists = id => {
  return !!jobs[id]
}

export const setDelayJob = (id, job, sec) => {
  if (isJobExists(id)) {
    delDelayJob(id)
  }
  jobs[id] = setTimeout(() => {
    job()
    delDelayJob(id)
  }, sec * 1000)
}

export const resetJobs = () => {
  Object.keys(jobs).forEach(delDelayJob)
}

export const getAllJobs = () => ({ ...jobs })
