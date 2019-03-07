export const getCommonProblem = async (_, args, context) => {
  const db = await context.getDb()

  return await db
    .collection('commonProblems')
    .find({})
    .toArray()
}
