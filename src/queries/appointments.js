import { ObjectId } from 'mongodb'
const moment = require('moment')

export const monthlyAppointments = async (_, args, context) => {
  const db = await context.getDb()
  const { monthStr, healthCareTeamId } = args
  const $match = {
    healthCareTeamId: { $ne: null },
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
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$appointmentTime' },
            },
            healthCareTeamId: '$healthCareTeamId',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          details: {
            $push: {
              healthCareTeamId: '$_id.healthCareTeamId',
              count: '$count',
            },
          },
          count: { $sum: '$count' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          details: 1,
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
