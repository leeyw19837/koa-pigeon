import moment = require('moment')
import { Db } from 'mongodb'


export default async (_, args, { db }: { db: Db }) => {
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
  const treatmentStates = await db
    .collection('treatmentState')
    .find(query)
    .toArray()

  return treatmentStates
}
