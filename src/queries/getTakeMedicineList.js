import moment from 'moment'
export const getTakeMedicineList = async (_, args, context) => {
  const db = await context.getDb()

  const { healthCareTeamId, outpatientDate } = args
  const date = new Date(outpatientDate)
  const start = moment(date).startOf('d')._d
  const end = moment(date).endOf('d')._d
  const userList = await db
    .collection('event')
    .find({
      patientId: { $ne: null },
      healthCareTeamId,
      type: 'GET_MEDICINE',
      createdAt: { $gte: start, $lte: end },
    })
    .toArray()

  return userList
}
