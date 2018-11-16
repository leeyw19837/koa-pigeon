import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import moment from 'moment'
import map from 'lodash/map'
import {
  isLessFour,
  isMealRecord,
  isBigFluctuation,
  isAfterMeal,
  isAboveSeven,
  isAboveTen,
} from './utils'
import { getPairingBgRecord } from './pairedMeasurement'

const TIME_PERIOD_MAP = {
  BEFORE_BREAKFAST: '早餐前',
  AFTER_BREAKFAST: '早餐后',
  BEFORE_LUNCH: '午餐前',
  AFTER_LUNCH: '午餐后',
  BEFORE_DINNER: '晚餐前',
  AFTER_DINNER: '晚餐后',
  BEFORE_SLEEPING: '睡前',
  MIDNIGHT: '凌晨',
  RANDOM: '随机',
}
const assembleTaskDesc = (measuerments,createdAt) => {
  const summaryOfMeasurements = map(
    measuerments,
    ({ measurementTime, bloodGlucoseValue }) => {
      const timePeriod = TIME_PERIOD_MAP[measurementTime] || measurementTime
      const transformedBG = (bloodGlucoseValue / 18).toFixed(1)
      return `${timePeriod} ${transformedBG}`
    },
  ).join('; ')
  const fmtCreatedAt = moment(createdAt).format('MM-DD HH:mm')
  return `${fmtCreatedAt} (${summaryOfMeasurements})`
}

export const taskGen = async (measurement, getPairingMethod) => {
  const userInfo = await db.collection('users').findOne({ _id: ObjectId(measurement.patientId) })
  if (userInfo.patientState && userInfo.patientState === 'ARCHIVED') return null
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
    newTask.desc = assembleTaskDesc(newTask.measurementRecords,now)
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
    newTask.desc = assembleTaskDesc(newTask.measurementRecords,now)
    return newTask
  }

  if (isAfterMeal(measurementTime) && isAboveTen(bloodGlucoseValue)) {
    // 餐后高血糖
    newTask.type = 'AFTER_MEALS_HIGH'
    newTask.measurementRecords = [measurement]
    newTask.desc = assembleTaskDesc(newTask.measurementRecords,now)
    return newTask
  }
  if (
    measurementTime === 'BEFORE_BREAKFAST' &&
    isAboveSeven(bloodGlucoseValue)
  ) {
    // 空腹高血糖
    newTask.type = 'EMPTY_STOMACH_HIGH'
    newTask.measurementRecords = [measurement]
    newTask.desc = assembleTaskDesc(newTask.measurementRecords,now)
    return newTask
  }
}
