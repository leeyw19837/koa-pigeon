export const certifiedDiabetesEducator = async (
  _,
  { cdeId, assistantId },
  { getDb },
) => {
  let condition = { userId: assistantId || '66728d10dc75bc6a43052036' }
  if (cdeId) condition = { _id: cdeId }

  const db = await getDb()

  return db.collection('certifiedDiabetesEducators').findOne(condition)
}
