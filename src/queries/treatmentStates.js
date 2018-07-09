import moment from 'moment'

export const treatmentStates = async (_, args, { getDb }) => {
  const db = await getDb()

  let query = {}
  if (args.healthCareTeamId) {
    query = { ...query, healthCareTeamId: args.healthCareTeamId }
  }
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
      ...query,
      appointmentTime: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }
  }
  console.log(query, '=====')
  const treatmentStateObjects = await db
    .collection('treatmentState')
    .find(query)
    .toArray()

  return treatmentStateObjects
}
