import { Db } from 'mongodb'


export const meanWaitingTimes = async (_, args, { db }: { db: Db }) => {
  const averages = await db
    .collection('treatmentState')
    .aggregate([
      { $match: { 'timing.checkIn': { $exists: 1 }, 'timing.print': { $exists: 1 } } },
      {
        $project: {
          appointmentTime: 1,
          assessmentTimeInMins: { $divide: [{ $subtract: ['$timing.print', '$timing.checkIn'] }, 60 * 1000] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$appointmentTime' },
            month: { $month: '$appointmentTime' },
            day: { $dayOfMonth: '$appointmentTime' },
          },
          assessmentTimesInMins: { $push: '$assessmentTimeInMins' },
        },
      },
      { $match: { 'assessmentTimesInMins.4': { $exists: 1 } } },
      { $unwind: '$assessmentTimesInMins' },
      { $group: { _id: '$_id', averageAssessmentTimeInMins: { $avg: '$assessmentTimesInMins' } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]).toArray()

  return averages.map(({
      _id: {
        year, month, day,
      },
    averageAssessmentTimeInMins,
    }) => {
    let twoDigitMonths = String(month)
    if (twoDigitMonths.length === 1) {
      twoDigitMonths = `0${twoDigitMonths}`
    }

    let twoDigitDays = String(day)
    if (twoDigitDays.length === 1) {
      twoDigitDays = `0${twoDigitDays}`
    }

    return {
      x: Number(`${year}${twoDigitMonths}${twoDigitDays}`),
      y: Math.round(averageAssessmentTimeInMins),
    }
  })
}
