export const submitFeedback = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, text } = args

  await db.collection('feedback').insertOne({
    createdAt: new Date(),
    patientId,
    text,
  })

  return true
}
