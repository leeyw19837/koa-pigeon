export const getTaskSoap = async (_, { taskId }, { getDb }) => {
  const db = await getDb()
  const result = await db
    .collection('taskSoap')
    .findOne({ taskId, status: { $ne: 'removed' } })

  return result
}
