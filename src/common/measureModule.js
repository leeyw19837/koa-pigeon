import { dinnerMap, shouldCheckProps } from '../cronJob/controller/constants'
import {
  getMeasureModules,
  getBloodGlucoses,
  getBgMeasureModules,
} from '../cronJob/controller/dataServices'

import isEmpty from 'lodash/isEmpty'
import moment from 'moment'

export const getMeasureFeedback = async ({ patientId, compareDate }) => {
  const result = {}
  const patientsId = [patientId]
  const bgDatas = await getBloodGlucoses(patientsId, compareDate)
  const measureModule = await getMeasureModules(patientsId)
  const bgMeasureModules = await getBgMeasureModules()
  let bgMeasureModule = {}
  if (measureModule.length) {
    const { bgMeasureModuleId, type } = measureModule[0]
    bgMeasureModule = bgMeasureModules.filter(
      o => o._id === bgMeasureModuleId,
    )[0]
  }
  if (bgDatas.length && !isEmpty(bgMeasureModule)) {
    const actualMeasure = {
      morning: {
        pairing: 0,
        count: 0,
      },
      midday: {
        pairing: 0,
        count: 0,
      },
      evening: {
        pairing: 0,
        count: 0,
      },
      beforeSleep: {
        pairing: 0,
        count: 0,
      },
    }
    const hasMeasureData = {}
    bgDatas.forEach(bgItem => {
      const { measuredAt, measurementTime } = bgItem
      const formatMeasureDate = moment(measuredAt).format('YYYY-MM-DD')
      const key = dinnerMap[measurementTime]
      if (!hasMeasureData[formatMeasureDate]) {
        hasMeasureData[formatMeasureDate] = {
          [key]: true,
        }
      } else if (!hasMeasureData[formatMeasureDate][key]) {
        hasMeasureData[formatMeasureDate][key] = true
      }
    })

    Object.keys(hasMeasureData).forEach(o => {
      const item = hasMeasureData[o]
      ;['morning', 'midday', 'evening', 'beforeSleep'].forEach(key => {
        const beforeKey = `${key}_b`
        const afterKey = `${key}_a`
        if (key === 'beforeSleep' && item[key]) actualMeasure[key].count += 1
        if (item[beforeKey]) {
          actualMeasure[key].count += 1
          if (item[afterKey]) {
            actualMeasure[key].pairing += 1
          }
        }
      })
    })

    const notCompletedMeasure = {}
    let actualCount = 0
    let totalCount = 0
    shouldCheckProps.forEach(prop => {
      const { quantity, unit } = bgMeasureModule[prop]
      totalCount += quantity
      actualCount += actualData[unit]
      if (quantity && unit) {
        const actualData = actualMeasure[prop]
        if (prop === 'noLimit' || !actualData) {
          const { morning, midday, evening, beforeSleep } = actualMeasure
          const total =
            morning[unit] + midday[unit] + evening[unit] + beforeSleep[unit]
          if (total < quantity) {
            notCompletedMeasure[prop] = {
              quantity: quantity - total,
              unit,
            }
          }
        } else if (actualData[unit] < quantity) {
          notCompletedMeasure[prop] = {
            quantity: quantity - actualData[unit],
            unit,
          }
        }
      }
    })
    result.notCompletedMeasure = notCompletedMeasure
    result.actualMeasure = actualMeasure
    result.measureCompletedPrecent = ((actualCount / totalCount) * 100).toFixed(
      1,
    )
  }
  return result
}
