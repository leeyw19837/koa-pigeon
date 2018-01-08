const moment = require('moment')

export const outreachs = async (_, args, { getDb }) => {
  const db = await getDb()
  const { period, startDay = new Date('1949/10/1') } = args
  let query = {
    status: 'PENDING',
    appointmentTime: { $gte: moment(startDay).startOf('day')._d }
  }

  switch (period) {
    case 'oneDay':
      const startOfDay = moment(startDay).add(8, 'h').startOf('day')
      const endOfDay = moment(startOfDay._d).add(1, 'd')
      query = {
        status: 'PENDING',
        source: 'communication',
        $and: [
          { plannedDate: { $ne: null } },
          { plannedDate: { $gte: startOfDay._d } },
          { plannedDate: { $lt: endOfDay._d } }
        ]
      }
      break
    case 'oneWeek':
      const startOfCurrentWeek = moment(startDay).add(8, 'h').startOf('isoWeek')
      const endOfCurrentWeek = moment(startOfCurrentWeek).add(7, 'd')
      query = {
        status: 'PENDING',
        source: 'communication',
        $and: [
          { plannedDate: { $ne: null } },
          { plannedDate: { $gte: startOfCurrentWeek._d } },
          { plannedDate: { $lt: endOfCurrentWeek._d } }
        ]
      }
      break;
    case 'oneMonth':
      break
    default:

  }
  return db.collection('outreachs').find(query).toArray()
}
