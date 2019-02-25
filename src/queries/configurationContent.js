export const configurationContent = async (_, args, context) => {
  const db = await context.getDb()
  const { type } = args
  const result = await db.collection('configurationContent').findOne({ type })
  return result
}

export const getConfigByCategory = async (_, { category }, { getDb }) => {
  const db = await getDb()
  return db.collection('configurationContent').findOne({
    category,
  })
}
