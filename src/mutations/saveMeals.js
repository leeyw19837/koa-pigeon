export const saveMeals = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, mealTime, food } = args

  await db.collection('mealHistories').insertOne({
    patientId,
    mealTime,
    food,
    createdAt: new Date(),
  })

  return true
}
