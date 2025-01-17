import { ObjectId } from 'mongodb'
const moment = require('moment')

export const dailyOutpatients = async (_, args, context) => {
  const db = await context.getDb()
  const { healthCareTeamId = ['healthCareTeam1'] } = args
  const $match = {
    // hospitalId: { $ne: null },
  }
  if (healthCareTeamId && healthCareTeamId !== 'null') {
    $match.healthCareTeamId = {
      $in: healthCareTeamId,
    }
  }
  const result = await db
    .collection('outpatients')
    .aggregate([
      {
        $match,
      },
      {
        $sort: { outpatientDate: 1, outpatientPeriod: 1 },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $add: ['$outpatientDate', 8 * 3600000] },
            },
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
    ])
    .toArray()

  return result
}

export const outpatient = async (_, { id }, context) => {
  const db = await context.getDb()
  return await db.collection('outpatients').findOne({ _id: id })
}
