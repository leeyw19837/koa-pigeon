export const getTaskSoapCorpus = async (_, args, { getDb }) => {
  const db = await getDb()

  const result = await db
    .collection('taskSoapCorpus')
    .find({})
    .toArray()
  return result
}
