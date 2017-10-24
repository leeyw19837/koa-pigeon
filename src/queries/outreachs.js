const moment = require('moment')

export const outreachs = async (_, args, { getDb }) => {
  const db = await getDb()
  const { period } = args
  let before = moment().startOf('day')._d
  switch (period) {
    case 'all':
      before = moment().subtract(50, 'years').startOf('day')._d
      break
    case '3day':
      before = moment().subtract(3, 'days').startOf('day')._d
      break
    case '7day':
      before = moment().subtract(7, 'days').startOf('day')._d
      break
    default:
      before = moment().startOf('day')._d
  }

  return db.collection('outreachs').find({
    appointmentTime: { $gt: before }
  }).toArray()
}
