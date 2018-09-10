export const getUnreadTask = async (
  _,
  { patientId, type },
  { getDb },
) => {
  const db = await getDb()
  let condition = { patientId, state: 'PENDING' }
  if (type) {
    condition.type = type
  } else {
    condition.type = 'FOOD_CIRCLE'
  }
  const result = await db
    .collection('interventionTask')
    .count(condition)
  return result
}