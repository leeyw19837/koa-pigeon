const moment = require('moment')

export const warningsOfHigh = async (_, args, { getDb }) => {
  const db = await getDb()
  const { period, rangeLow = 10, rangeHigh = 33.3 } = args
  let bgLow = rangeLow * 18
  let bgHigh = rangeHigh * 18
  console.log('bgrange:', bgLow, '--' , bgHigh )
  let query = {
    warningType: 'HIGH_GLUCOSE',
    createAt: { $gte: moment().startOf('day')._d },
    bgValue: { $gte: bgLow, $lte: bgHigh },
    $or : [
      {isHandle: { $exists: false }},
      {isHandle: false},
    ],
  }
  switch (period) {
    case 'threeDays':
      query = {
        warningType: 'HIGH_GLUCOSE',
        createAt: { $gte: moment().subtract(2, 'd').startOf('day')._d },
        bgValue: { $gte: bgLow, $lte: bgHigh },
        $or : [
          {isHandle: { $exists: false }},
          {isHandle: false},
        ],
      }
      break
    case 'sevenDays':
      query = {
        warningType: 'HIGH_GLUCOSE',
        createAt: { $gte: moment().subtract(6, 'd').startOf('day')._d },
        bgValue: { $gte: bgLow, $lte: bgHigh },
        $or : [
          {isHandle: { $exists: false }},
          {isHandle: false},
        ],
      }
      break;
    case 'all':
      query = {
        warningType: 'HIGH_GLUCOSE',
        bgValue: { $gte: bgLow, $lte: bgHigh },
        $or : [
          {isHandle: { $exists: false }},
          {isHandle: false},
        ],
      }
      break
    default:
  }
  return db.collection('warnings').find(query).toArray()
}
