import moment from 'moment'
import { mealsPeriodTextMap, isAfterMeal } from './utils'

export const getPairingBgRecord = async ({
  patientId,
  measurementTime,
  measuredAt,
}) => {
  const pairedMealsPeriod = mealsPeriodTextMap[measurementTime]
  if (!pairedMealsPeriod) return null
  const sortBgValue = isAfterMeal(measurementTime) ? 1 : -1
  const bgRecords = await db
    .collection('bloodGlucoses')
    .find({
      patientId,
      measurementTime: pairedMealsPeriod,
      measuredAt: {
        $gte: moment(measuredAt).startOf('day')._d,
        $lt: moment(measuredAt).endOf('day')._d,
      },
    })
    .sort({
      bloodGlucoseValue: sortBgValue,
    })
    .limit(1)
    .toArray()
  return bgRecords.length ? bgRecords[0] : null
}
