import moment from 'moment'
import { groupBy, range } from 'lodash'
import { std } from 'mathjs'

export const glucoseMeasurementTimeOfDay = async (_, args, { getDb }) => {
  const db = await getDb()

  const bloodglucoses = await db
    .collection('bloodglucoses')
    .find()
    .toArray()
  const measurementTimes = bloodglucoses
    .map(b => b.createdAt)
    .map(d => moment(d).add(8, 'hours'))
    .map(m => ({ hour: m.hour(), minute: m.minute() }))

  const groupedMeasurementTimes = groupBy(measurementTimes, d => d.hour)

  const data = range(24).map(h => ({
    x: h,
    y: groupedMeasurementTimes[h].length,
    stdDev: std(groupedMeasurementTimes[h].map(d => d.minute)),
  }))

  return data
}
