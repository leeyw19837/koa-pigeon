const moment = require('moment')

export const warningsOfLow = async (_, args, { getDb }) => {
  const db = await getDb()
  const { period } = args
  let query = {
    warningType: 'LOW_GLUCOSE',
    createdAt: { $gte: moment().startOf('day')._d},
    $or : [
      {isHandle: { $exists: false }},
      {isHandle: false},
    ],
  }
  switch (period) {
    case 'threeDays':
      query = {
        warningType: 'LOW_GLUCOSE',
        createdAt: { $gte: moment().subtract(2, 'd').startOf('day')._d },
        $or : [
          {isHandle: { $exists: false }},
          {isHandle: false},
        ],
      }
      break
    case 'sevenDays':
    query = {
      warningType: 'LOW_GLUCOSE',
      createdAt: { $gte: moment().subtract(6, 'd').startOf('day')._d },
      $or : [
        {isHandle: { $exists: false }},
        {isHandle: false},
      ],
    }
      break;
    case 'all':
      query = {
        warningType: 'LOW_GLUCOSE',
        $or : [
          {isHandle: { $exists: false }},
          {isHandle: false},
        ],
      }
      break
    default:
  }
  console.log(query)
  return db.collection('warnings').find(query).sort({ createdAt: -1 }).toArray()
}
