export const fetchChatSnapshots = async (_, args, context) => {
  const db = await context.getDb()
  const { qaId } = args
  return await db.collection('aiChatQA').findOne({
    _id: qaId,
  })
}
