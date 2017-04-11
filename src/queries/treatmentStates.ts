import moment = require('moment')


export default async (_, args, { db }) => {
  let query = {}

  if (args.day) {
    const startOfDay = moment(args.day)
      .utcOffset(args.timezone)
      .startOf('day')
      .toDate()
    const endOfDay = moment(args.day)
      .utcOffset(args.timezone)
      .endOf('day')
      .toDate()

    query = {
      appointmentTime: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }
  }
  const oldStyleAppointments = await db
    .collection('appointments')
    .find(query)
    .toArray()

  return oldStyleAppointments.filter(a => a.patientId)
}
