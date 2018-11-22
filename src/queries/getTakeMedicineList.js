import moment from 'moment'
export const getTakeMedicineList = async (_, args, context) => {
  const db = await context.getDb()

  const { healthCareTeamId, outpatientDate } = args

  const chooseDay = outpatientDate || new Date()
  const start = moment(chooseDay).startOf('d')._d
  const end = moment(chooseDay).endOf('d')._d
  const userLits = await db
    .collection('event')
    .find({
      healthCareTeamId,
      type: 'GET_MEDICINE',
      createdAt: { $gte: start, $lte: end },
    })
    .toArray()

  return userLits
}
