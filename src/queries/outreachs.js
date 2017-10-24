const moment = require('moment')

export const outreachs = async (_, args, { getDb }) => {
  const db = await getDb()
  const { period, startDay = new Date('1949/10/1') } = args
  let before = moment().startOf('day')._d
  let query = {
    isHandle: false,
    appointmentTime: { $gt: moment(startDay).startOf('day')._d }
  }

  switch (period) {
    case 'oneDay':
      const startOfCurrentWeek = moment(startDay).startOf('isoWeek')
      const endOfCurrentWeek = moment(startOfCurrentWeek._d).add(7, 'd')
      query = {
        isHandle: false,
        $and: [
          { appointmentTime: { $gt: startOfCurrentWeek._d } },
          { appointmentTime: { $lt: endOfCurrentWeek._d } }
        ]
      }
      break
    case 'oneWeek':
      const startOfCurrentWeek = moment(startDay).startOf('isoWeek')
      const endOfCurrentWeek = moment(startOfCurrentWeek._d).add(7, 'd')
      query = {
        isHandle: false,
        $and: [
          { appointmentTime: { $gt: startOfCurrentWeek._d } },
          { appointmentTime: { $lt: endOfCurrentWeek._d } }
        ]
      }
      break;
    case 'oneMonth':

      break
    default:

  }

  return db.collection('outreachs').find(query).toArray()
}
