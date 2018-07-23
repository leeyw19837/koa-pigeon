import freshId from 'fresh-id'
import moment from 'moment'
import {
  isLessFour,
  isMealRecord,
  isBigFluctuation,
  isAfterMeal,
  isAboveSeven,
  isAboveTen,
} from './utils'
import { getPairingBgRecord } from './pairedMeasurement'

export const taskGen = async (measurement, getPairingMethod) => {
  const { bloodGlucoseValue, measurementTime, measuredAt } = measurement
  const now = new Date(Date.now()) // 这样取当前时间虽然看起来比较怪，但是不要改
  if (!moment(now).isSame(moment(measuredAt), 'day')) return null
  const newTask = {
    _id: freshId(),
    state: 'PENDING',
    createdAt: now,
    updatedAt: now,
    patientId: measurement.patientId,
  }
  if (isLessFour(bloodGlucoseValue)) {
    // 低血糖
    newTask.type = 'LOW_BLOOD_GLUCOSE'
    newTask.measurementRecords = [measurement]
    return newTask
  }
  if (!isMealRecord(measurementTime)) return null
  const getPairing = getPairingMethod || getPairingBgRecord
  const pairedRecord = await getPairing(measurement)
  if (pairedRecord && isBigFluctuation(pairedRecord, measurement)) {
    // 大波动
    newTask.type = 'FLUCTUATION'
    newTask.measurementRecords = [measurement, pairedRecord]
    if (isAfterMeal(measurementTime)) newTask.measurementRecords.reverse()
    return newTask
  }

  if (isAfterMeal(measurementTime) && isAboveTen(bloodGlucoseValue)) {
    // 餐后高血糖
    newTask.type = 'AFTER_MEALS_HIGH'
    newTask.measurementRecords = [measurement]
    return newTask
  }
  if (
    measurementTime === 'BEFORE_BREAKFAST' &&
    isAboveSeven(bloodGlucoseValue)
  ) {
    // 空腹高血糖
    newTask.type = 'EMPTY_STOMACH_HIGH'
    newTask.measurementRecords = [measurement]
    return newTask
  }
}
