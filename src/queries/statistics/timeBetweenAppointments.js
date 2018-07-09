import { flatten, mean, range, zip } from 'lodash'
import { std } from 'mathjs'
import moment from 'moment'

const getTimeRange = (from, intervalInDays, count) => {
  const dates = [from]
  const momentDate = moment(from)

  for (let i = 0; i < count; i++) {
    momentDate.subtract(intervalInDays, 'days')
    dates.push(momentDate.toDate())
  }

  dates.reverse()
  return dates
}

export const timeBetweenAppointments = async (_, args, { getDb }) => {
  const db = await getDb()

  const dates = getTimeRange(new Date(), 7, 16)

  const appointmentsByDate = await Promise.all(
    dates.map(
      async date =>
        await db
          .collection('appointments')
          .aggregate([
            { $match: { isOutPatient: true, type: { $ne: 'addition' } } },
            { $sort: { appointmentTime: 1 } },
            { $match: { appointmentTime: { $lte: date } } },
            {
              $group: {
                _id: '$patientId',
                appointmentTimes: { $push: '$appointmentTime' },
              },
            },
            { $match: { 'appointmentTimes.1': { $exists: 1 } } },
            { $project: { _id: 0, appointmentTimes: 1 } },
          ])
          .toArray(),
    ),
  )

  const meansAndStdDevs = appointmentsByDate.map(users => {
    const waitingTimesForUser = users.map(({ appointmentTimes }) => {
      const zipped = zip(
        appointmentTimes.slice(0, appointmentTimes.length - 1),
        appointmentTimes.slice(1),
      )
      return zipped.map(([d1, d2]) => moment(d2).diff(moment(d1), 'days'))
    })

    const waitingTimes = flatten(waitingTimesForUser)
    const y = mean(waitingTimes)
    const stdDev = std(waitingTimes)

    return { y, stdDev }
  })

  return range(meansAndStdDevs.length).map(i => ({
    x: Number(moment(dates[i]).format('YYYYMMDD')),
    ...meansAndStdDevs[i],
  }))
}
