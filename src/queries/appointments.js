import { ObjectId } from 'mongodb'
const moment = require('moment')

export const monthlyAppointments = async (_, args, context) => {
  const db = await context.getDb()
  const { monthStr, healthCareTeamId } = args
  const $match = {
    appointmentTime: { $ne: null },
    patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
  }
  if (monthStr) {
    const startOfMonth = moment(monthStr || new Date())
      .startOf('month')
      .toDate()
    const endOfMonth = moment(monthStr || new Date())
      .endOf('month')
      .toDate()
    $match.appointmentTime.$gt = startOfMonth
    $match.appointmentTime.$lte = endOfMonth
  }
  if (healthCareTeamId) {
    $match.healthCareTeamId = healthCareTeamId
  }
  const result = await db
    .collection('appointments')
    .aggregate([
      {
        $match,
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$appointmentTime' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          date: '$_id',
          count: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ])
    .toArray()

  return result
}
