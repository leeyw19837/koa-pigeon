import { lte, gte } from 'lodash'

import moment from 'moment'

export const warningsOfHigh = async (_, args, { getDb }) => {
  const db = await getDb()
  const { period, rangeLow = 10, rangeHigh = 33.3 } = args
  let query = {
    warningType: 'HIGH_GLUCOSE',
    createdAt: { $gte: moment().startOf('day')._d },
    $or: [{ isHandle: { $exists: false } }, { isHandle: false }],
  }
  switch (period) {
    case 'threeDays':
      query.createdAt = {
        $gte: moment()
          .subtract(2, 'd')
          .startOf('day')._d,
      }
      break
    case 'sevenDays':
      query.createdAt = {
        $gte: moment()
          .subtract(6, 'd')
          .startOf('day')._d,
      }
      break
    case 'all':
      query.createdAt = {
        $exists: true,
      }
      break
    default:
  }
  const warninglists = await db
    .collection('warnings')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray()

  return warninglists
    .filter(
      item =>
        gte(item.bgValue, 18 * rangeLow) && lte(item.bgValue, 18 * rangeHigh),
    )
    .map(x => ({
      ...x,
      bloodGlucoseValue: x.bloodGlucoseValue || +x.bgValue,
    }))
}
