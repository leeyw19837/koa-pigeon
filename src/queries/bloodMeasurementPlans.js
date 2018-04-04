import * as get from 'lodash/get'
import * as sortBy from 'lodash/sortBy'
import * as moment from 'moment'
export const bloodMeasurementPlans = async (_, args, { getDb }) => {
  let acM = {}
  let noC = {}

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
  const dinnerMap = {
    早餐前: 'morning_b',
    早餐后: 'morning_a',
    中餐前: 'midday_b',
    中餐后: 'midday_a',
    晚餐前: 'evening_b',
    晚餐后: 'evening_a',
    睡前: 'beforeSleep',
  }

  const sameMap = {
    午餐前: '中餐前',
    午餐后: '中餐后',
    晚饭前: '晚餐前',
    晚饭后: '晚餐后',
  }

  const shouldCheckProps = [
    'morning',
    'midday',
    'evening',
    'beforeSleep',
    'noLimit',
  ]

  const hasMeasureData = {}
  let define = []

  const db = await getDb()
  //   const cursor = { author: args.patientId }
  //   if (args.from && args.to) {
  //     Object.assign(cursor, { createdAt: { $gt: args.from, $lt: args.to } })
  //   }

  const dateofweek = moment('2017-10-21').startOf('isoWeek')
  const measureModules = await db
    .collection('measureModules')
    .find({
      patientId: args.patientId,
      startAt: {
        $lte: '2017-10-21',
      },
      endAt: {
        $gte: '2017-12-01',
      },
    })
    .toArray()
  if (measureModules.length > 0) {
    const activeModule = sortBy(measureModules, [
      'endAt',
      'createdAt',
    ]).reverse()[0]

    define = await db
      .collection('bgMeasureModule')
      .findOne({ _id: activeModule.bgMeasureModuleId })

    const bloodGlucoses = await db
      .collection('bloodglucoses')
      .find({
        author: args.patientId,
        createdAt: {
          $gt: dateofweek._d,
        },
      })
      .sort({ createdAt: -1 })
      .toArray()

    bloodGlucoses.forEach(bgItem => {
      const { createdAt, dinnerSituation } = bgItem
      const formatMeasureDate = moment(createdAt).format('YYYY-MM-DD')
      const key = dinnerMap[sameMap[dinnerSituation] || dinnerSituation]
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
        if (item[beforeKey]) {
          actualMeasure[key].count += 1
          if (item[afterKey]) {
            actualMeasure[key].pairing += 1
          }
        }
      })
    })
    let notCompletedMeasure = {}
    shouldCheckProps.forEach(prop => {
      const { quantity, unit } = define[prop]
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
    acM = actualMeasure
    noC = notCompletedMeasure
    return {
      type: activeModule.type,
      notCompletedMeasure: noC,
      actualMeasure: acM,
      modules: define,
    }
  }
  return {
    type: '',
    notCompletedMeasure: null,
    actualMeasure: null,
    modules: null,
  }
}
