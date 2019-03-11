import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import moment from 'moment'
import map from 'lodash/map'
import get from 'lodash/get'
import first from 'lodash/first'
import {
  isLessFour,
  isMealRecord,
  isBigFluctuation,
  isAfterMeal,
  isAboveSeven,
  isAboveTen,
} from './utils'
import { getPairingBgRecord } from './pairedMeasurement'
import { getRiskLevel } from './riskLevel'
import { pubsub } from '../../pubsub'

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
const assembleTaskDesc = (measuerments, createdAt) => {
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
  const userInfo = await db
    .collection('users')
    .findOne({ _id: ObjectId(measurement.patientId) })
  if (userInfo.patientState && userInfo.patientState === 'ARCHIVED') return null
  const { bloodGlucoseValue, measurementTime, measuredAt } = measurement
  const now = new Date(Date.now()) // 这样取当前时间虽然看起来比较怪，但是不要改
  if (!moment(now).isSame(moment(measuredAt), 'day')) return null

  let latestHbA1c = await db
    .collection('clinicalLabResults')
    .find({ patientId: measurement.patientId })
    .sort({ testDate: -1 })
    .limit(1)
    .toArray()
  latestHbA1c = get(latestHbA1c, '0.glycatedHemoglobin', 99)

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
    newTask.desc = assembleTaskDesc(newTask.measurementRecords, now)
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
    newTask.desc = assembleTaskDesc(newTask.measurementRecords, now)
    return newTask
  }

  if (isAfterMeal(measurementTime) && isAboveTen(bloodGlucoseValue)) {
    // 餐后高血糖
    newTask.type = 'AFTER_MEALS_HIGH'
    newTask.measurementRecords = [measurement]
    newTask.desc = assembleTaskDesc(newTask.measurementRecords, now)
    newTask.riskLevel = await getRiskLevel({ latestHbA1c, task: newTask })
    return newTask
  }
  if (
    measurementTime === 'BEFORE_BREAKFAST' &&
    isAboveSeven(bloodGlucoseValue)
  ) {
    // 空腹高血糖
    newTask.type = 'EMPTY_STOMACH_HIGH'
    newTask.measurementRecords = [measurement]
    newTask.desc = assembleTaskDesc(newTask.measurementRecords, now)
    newTask.riskLevel = await getRiskLevel({ latestHbA1c, task: newTask })
    return newTask
  }
}

const getNearestDay26 = () => {
  const currentDayOfMonth = moment().date()
  const monthOffset = currentDayOfMonth < 26 ? 1 : 0
  const nearestDay26 = moment()
    .subtract('months', monthOffset)
    .set('date', 26)
    .startOf('days')._d
  return nearestDay26
}
export const getNearestTaskWithSameType = async ({ _id, type, patientId }) => {
  const nearestDay26 = getNearestDay26()
  let prevTask = await db
    .collection('interventionTask')
    .find({
      _id: { $ne: _id },
      patientId,
      type,
      state: { $nin: ['SILENT', 'DONE_WITH_NO_SOAP'] },
      createdAt: { $gt: nearestDay26 },
    })
    .limit(1)
    .sort({ createdAt: -1 })
    .toArray()
  prevTask = first(prevTask)
  return prevTask
}

export const saveTask = async task => {
  let shouldPub = false,
    shouldSilenceNearest = false
  if (task.type === 'LOW_BLOOD_GLUCOSE') {
    shouldPub = true
  } else {
    const nearestTask = await getNearestTaskWithSameType(task)
    if (!nearestTask) shouldPub = true
    else {
      const isNearestTaskDone = nearestTask.state === 'DONE'
      if (task.type === 'FLUCTUATION') {
        // 覆盖上次
        shouldPub = !isNearestTaskDone
        shouldSilenceNearest = shouldPub
      } else if (
        task.type === 'AFTER_MEALS_HIGH' ||
        task.type === 'EMPTY_STOMACH_HIGH'
      ) {
        // 大于0表示新任务的优先级更高
        const diffRiskLevel = nearestTask.riskLevel - task.riskLevel
        if (isNearestTaskDone) {
          shouldPub = diffRiskLevel > 0
        } else {
          // 覆盖上次
          shouldPub = diffRiskLevel >= 0
          shouldSilenceNearest = shouldPub
        }
      }
    }

    if (shouldSilenceNearest) {
      await db
        .collection('interventionTask')
        .update({ _id: nearestTask._id }, { $set: { state: 'SILENT' } })
      pubsub.publish('interventionTaskDynamics', {
        ...nearestTask,
        state: 'SILENT',
        _operation: 'UPDATED',
      })
    }
  }
  const taskState = shouldPub ? 'PENDING' : 'SILENT'
  await db.collection('interventionTask').insert({ ...task, state: taskState })
  if (
    shouldPub ||
    (!shouldPub &&
      (task.type === 'AFTER_MEALS_HIGH' || task.type === 'EMPTY_STOMACH_HIGH'))
  ) {
    pubsub.publish('interventionTaskDynamics', {
      ...task,
      state: taskState,
      _operation: 'ADDED',
    })
  }
}
