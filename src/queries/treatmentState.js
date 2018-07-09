import moment = require('moment')

import { IContext } from '../types'


export const treatmentState = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

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
      patientId: args.patientId,
      appointmentTime: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }
  }
  return await db
    .collection('treatmentState')
    .findOne(query)
}
