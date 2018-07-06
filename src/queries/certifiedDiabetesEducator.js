export const certifiedDiabetesEducator = async (_, args, { getDb }) => {
  let condition = { userId: args.assistantId }
  const db = await getDb()
  return db.collection('certifiedDiabetesEducators').findOne(condition)
}
