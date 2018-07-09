export const sentences = async (_, args, { getDb }) => {
  const db = await getDb()
  const { usedFor, authors } = args
  const query = {}
  if (usedFor) query.usedFor = usedFor
  if (authors) query.author = { $in: authors }
  return await db
    .collection('sentences')
    .find(query)
    .toArray()
}
