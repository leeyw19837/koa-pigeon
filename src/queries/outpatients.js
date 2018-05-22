import { ObjectId } from 'mongodb'
const moment = require('moment')

export const dailyOutpatients = async (_, args, context) => {
  const db = await context.getDb()
  const { healthCareTeamId } = args
  const $match = {
    hospitalId: { $ne: null },
  }
  if (healthCareTeamId) {
    $match.hospitalId = healthCareTeamId
  }
  const result = await db
    .collection('outpatients')
    .aggregate([
      {
        $match,
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$outpatientDate' },
          },
          outpatients: {
            $push: '$$ROOT',
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          outpatients: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ])
    .toArray()

  return result
}
