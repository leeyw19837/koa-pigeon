import moment = require('moment')

import { IContext } from '../types'


export const treatmentStates = async (_, args, { getDb }: IContext) => {
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
      appointmentTime: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }
  }
  const treatmentStateObjects = await db
    .collection('treatmentState')
    .find(query)
    .toArray()

  return treatmentStateObjects
}
