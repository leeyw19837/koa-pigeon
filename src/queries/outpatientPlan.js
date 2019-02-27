import dayjs from 'dayjs'

export const getOutpatientPlan = async (_, { id }, { getDb }) => {
  const db = await getDb()
  return await db.collection('outpatientPlan').findOne({ _id: id })
}

export const getOutpatientPlans = async (_, { date }, { getDb }) => {
  const db = await getDb()
  const firstDay = dayjs(date)
    .startOf('month')
    .subtract(3, 'day')
    .format('YYYY-MM-DD')
  const lastDay = dayjs(date)
    .endOf('month')
    .add(13, 'day')
    .format('YYYY-MM-DD')
  return await db
    .collection('outpatientPlan')
    .find({ date: { $gte: firstDay, $lt: lastDay } })
    .toArray()
}
