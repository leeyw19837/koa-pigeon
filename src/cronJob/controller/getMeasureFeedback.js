import { sendMeasurePlan } from './sendTxt'
import {
  shouldCheckProps,
  periodTextMap,
  dinnerMap,
  sameMap,
  SUNDAY_TEXT_NO_MEASURE_ID,
  SUNDAY_TEXT_NO_COMPLETED_ID,
  SUNDAY_TEXT_COMPLETED_ID,
} from './constants'

const isEmpty = require('lodash/isEmpty')
const moment = require('moment')

export const getMeasureFeedback = ({
  bloodGlucoses,
  patientId,
  bgMeasureModule,
}) => {
  let configOption = {}
  // TEST
  let acM = {}
  let noC = {}
  const pBgDatas = bloodGlucoses.filter(o => o.patientId === patientId)
  console.log('pBgDatas', pBgDatas.length, patientId)
  if (!pBgDatas.length) {
    configOption.templateId = SUNDAY_TEXT_NO_MEASURE_ID
  } else {
    const startAt = moment()
      .subtract(6, 'days')
      .startOf('day')
    const endAt = moment()
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
    pBgDatas.forEach(bgItem => {
      const { measuredAt, measurementTime } = bgItem
      const formatMeasureDate = moment(measuredAt).format('YYYY-MM-DD')
      const key = dinnerMap[measurementTime]
      console.log(measuredAt, measurementTime, key)
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
      if (item.beforeSleep) {
        actualMeasure.beforeSleep.count += 1
      } else {
        const keys = ['morning', 'midday', 'evening']
        keys.forEach(key => {
          const beforeKey = `${key}_b`
          const afterKey = `${key}_a`
          if (item[beforeKey]) {
            actualMeasure[key].count += 1
            if (item[afterKey]) {
              actualMeasure[key].pairing += 1
            }
          }
        })
      }
    })
    const notCompletedMeasure = {}
    shouldCheckProps.forEach(prop => {
      const { quantity, unit } = bgMeasureModule[prop]
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
    // Test
    acM = actualMeasure
    noC = notCompletedMeasure
    configOption.templateId = isEmpty(notCompletedMeasure)
      ? SUNDAY_TEXT_COMPLETED_ID
      : SUNDAY_TEXT_NO_COMPLETED_ID
  }
  return {
    configOption,
    notCompletedMeasure: noC,
    actualMeasure: acM,
  }
}
