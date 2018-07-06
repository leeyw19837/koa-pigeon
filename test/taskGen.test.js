import moment from 'moment'
import { taskGen } from '../src/modules/bloodGlucose'

const dateNowSpy = jest
  .spyOn(Date, 'now')
  .mockImplementation(() => 1530695014106) // mock now to 2018-07-04

describe('触发院外干预任务', () => {
  let newMesurement
  const returnNull = jest.fn(() => null)
  describe('低血糖', () => {
    beforeEach(() => {
      returnNull.mockClear()
      newMesurement = {
        bloodGlucoseValue: 72,
        measurementTime: 'BEFORE_BREAKFAST',
        measuredAt: moment('2018-07-04')._d,
      }
    })
    test('非当天的测量数据不会触发低血糖干预任务', () => {
      newMesurement.bloodGlucoseValue = 71
      newMesurement.measuredAt = moment('2018-07-03')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeFalsy()
    })
    test('血糖值大于4时不会触发低血糖干预任务', () => {
      newMesurement.bloodGlucoseValue = 73
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeFalsy()
    })
    test('血糖值等于4时不会触发低血糖干预任务', () => {
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeFalsy()
    })
    test('血糖值小于4时触发低血糖干预任务', () => {
      newMesurement.bloodGlucoseValue = 71
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).toEqual('LOW_BLOOD_GLUCOSE')
      expect(task.measurementRecords.length).toBe(1)
      expect(task.measurementRecords[0]).toEqual(newMesurement)
      expect(returnNull.mock.calls.length).toBe(0)
    })
  })
  describe('大波动', () => {
    const returnArgs = pairing => () => pairing
    beforeEach(() => {
      newMesurement = {
        bloodGlucoseValue: 80,
        measurementTime: 'BEFORE_LUNCH',
        measuredAt: moment('2018-07-04')._d,
      }
    })

    test('返回了配对数据且血糖波动大于3.5触发', () => {
      const r = taskGen(
        newMesurement,
        returnArgs({
          bloodGlucoseValue: 164,
          measurementTime: 'AFTER_LUNCH',
        }),
      )
      expect(r).toBeTruthy()
    })
    test('返回了配对数据且血糖波动等于3.5触发', () => {
      const r = taskGen(
        newMesurement,
        returnArgs({
          bloodGlucoseValue: 143,
          measurementTime: 'AFTER_LUNCH',
        }),
      )
      expect(r).toBeTruthy()
    })
    test('导致触发大波动的两条数据的副本按顺序保存在任务里', () => {
      const r = taskGen(
        newMesurement,
        returnArgs({
          bloodGlucoseValue: 143,
          measurementTime: 'AFTER_LUNCH',
        }),
      )
      expect(r.measurementRecords.length).toBe(2)
      expect(r.measurementRecords[0].measurementTime).toEqual('BEFORE_LUNCH')
      expect(r.measurementRecords[1].measurementTime).toEqual('AFTER_LUNCH')

      const r2 = taskGen(
        {
          bloodGlucoseValue: 143,
          measurementTime: 'AFTER_LUNCH',
          measuredAt: moment('2018-07-04')._d,
        },
        returnArgs(newMesurement),
      )
      expect(r2.measurementRecords.length).toBe(2)
      expect(r2.measurementRecords[0].measurementTime).toEqual('BEFORE_LUNCH')
      expect(r2.measurementRecords[1].measurementTime).toEqual('AFTER_LUNCH')
    })
    test('非当天的测量数据不触发', () => {
      newMesurement.measuredAt = moment('2018-07-01')._d
      const r = taskGen(newMesurement, returnArgs())
      expect(r).toBeFalsy()
    })
    test('没有配对的数据时不触发', () => {
      newMesurement.measuredAt = moment('2018-07-04')._d
      const r = taskGen(newMesurement, returnArgs())
      expect(r).toBeFalsy()
    })
  })
  describe('空腹高血糖', () => {
    beforeEach(() => {
      returnNull.mockClear()
      newMesurement = {
        bloodGlucoseValue: 126,
        measurementTime: 'BEFORE_BREAKFAST',
        measuredAt: moment('2018-07-04')._d,
      }
    })
    test('当天测量且数值高于7时触发', () => {
      newMesurement.bloodGlucoseValue = 144
      newMesurement.measuredAt = moment('2018-07-04')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).toEqual('EMPTY_STOMACH_HIGH')
    })
    test('当天测量且数值等于7时触发', () => {
      newMesurement.measuredAt = moment('2018-07-04')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).toEqual('EMPTY_STOMACH_HIGH')
    })
    test('非当天的测量数据不会触发', () => {
      newMesurement.measuredAt = moment('2018-07-03')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeFalsy()
    })
    test('非早餐前的测量不会触发', () => {
      newMesurement.measurementTime = 'AFTER_BREAKFAST'
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).not.toEqual('EMPTY_STOMACH_HIGH')
    })
  })
  describe('餐后高血糖', () => {
    beforeEach(() => {
      returnNull.mockClear()
      newMesurement = {
        bloodGlucoseValue: 126,
        measurementTime: 'AFTER_BREAKFAST',
        measuredAt: moment('2018-07-04')._d,
      }
    })
    test('当天测量且数值高于10时触发', () => {
      newMesurement.bloodGlucoseValue = 198
      newMesurement.measuredAt = moment('2018-07-04')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).toEqual('AFTER_MEALS_HIGH')
    })
    test('当天测量且数值等于10时触发', () => {
      newMesurement.bloodGlucoseValue = 180
      newMesurement.measuredAt = moment('2018-07-04')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).toEqual('AFTER_MEALS_HIGH')
    })
    test('非当天的测量数据不会触发', () => {
      newMesurement.bloodGlucoseValue = 180
      newMesurement.measuredAt = moment('2018-07-03')._d
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeFalsy()
    })
    test('非餐后的测量不会触发', () => {
      newMesurement.measurementTime = 'BEFORE_BREAKFAST'
      newMesurement.bloodGlucoseValue = 180
      const task = taskGen(newMesurement, returnNull)
      expect(task).toBeTruthy()
      expect(task.type).not.toEqual('AFTER_MEALS_HIGH')
    })
  })
  afterAll(() => {
    dateNowSpy.mockReset()
  })
})
