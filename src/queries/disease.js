export const getDisease = async (_, args, { getDb }) => {
  const db = await getDb()
  return await db
    .collection('disease')
    .find()
    .toArray()
}
