import {
  delDelayJob,
  isJobExists,
  setDelayJob,
  getAllJobs,
  resetJobs,
} from '../src/modules/delayJob'

jest.useFakeTimers()

describe('useFakeTimers', () => {
  test('', () => {
    const start = new Date().getTime()
    setTimeout(() => {
      const end = new Date().getTime()
      expect(end - start).toBeLessThan(10)
    }, 10000)
    jest.runOnlyPendingTimers()
  })
})

describe('延迟任务单元测试', () => {
  test('可以添加任务', () => {
    setDelayJob('testAdd1', () => {}, 10)
    expect(getAllJobs()).toHaveProperty('testAdd1')
    expect(getAllJobs()).not.toHaveProperty('testAdd2')
    setDelayJob('testAdd2', () => {}, 10)
    expect(getAllJobs()).toHaveProperty('testAdd1')
    expect(getAllJobs()).toHaveProperty('testAdd2')
  })

  test('添加后可以删除', () => {
    const jobId = 'testAdd'
    setDelayJob(jobId, () => {}, 10)
    expect(isJobExists(jobId)).toBe(true)
    delDelayJob(jobId)
    expect(isJobExists(jobId)).toBe(false)
    expect(getAllJobs()).not.toHaveProperty(jobId)
  })

  test('任务会在指定时间执行,', () => {
    const jobId = 'testRun'
    const mockFn = jest.fn()
    setDelayJob(jobId, mockFn, 10)
    jest.runOnlyPendingTimers()
    expect(mockFn.mock.calls.length).toBe(1)
    expect(isJobExists(jobId)).toBe(false)
  })

  test('删除后任务取消，不会执行', () => {
    const jobId = 'testRemove'
    const mockFn = jest.fn()
    setDelayJob(jobId, mockFn, 10)
    delDelayJob(jobId)
    jest.runOnlyPendingTimers()
    expect(mockFn.mock.calls.length).toBe(0)
  })
  afterEach(() => {
    resetJobs()
  })
})
