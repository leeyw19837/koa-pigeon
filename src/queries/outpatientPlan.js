import dayjs from 'dayjs'

export const getOutpatientPlan = async (_, { id }, { getDb }) => {
  const db = await getDb()
  return await db.collection('outpatientPlan').findOne({ _id })
}

export const getGroupedOutpatientPlans = async (_, { date }, { getDb }) => {
  const db = await getDb()
  const firstDay = dayjs(date)
    .startOf('month')
    .subtract(7, 'day')
  const lastDay = dayjs(date)
    .endOf('month')
    .add(7, 'day')
  return await db
    .collection('outpatientPlan')
    .find({ date: { $gte: firstDay, $lt: lastDay } })
    .toArray()
}
