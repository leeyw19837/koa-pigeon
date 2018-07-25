import moment from 'moment'

export const getFoodRecords = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId } = args
  const cursor = { patientId }
  let foods = await db
    .collection('foods')
    .find(cursor)
    .sort({ createdAt: -1 })
    .toArray()
  return foods
}
