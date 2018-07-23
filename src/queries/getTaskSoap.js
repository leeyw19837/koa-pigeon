export const getTaskSoap = async (_, { taskId }, { getDb }) => {
  const db = await getDb()
  const result = await db.collection('taskSoap').findOne({ taskId })

  return result
}
