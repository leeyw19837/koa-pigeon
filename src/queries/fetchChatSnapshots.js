export const fetchChatSnapshots = async (_, args, context) => {
  const { qaId } = args
  return await db.getCollection('aiChatQA').findOne({
    _id: qaId,
  })
}
