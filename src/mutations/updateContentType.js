export const updateContentType = async (_, args, context) => {
  const db = await context.getDb()
  const { messageId, contentType } = args
  await db.collection('needleChatMessages').update(
    {
      _id: messageId,
    },
    {
      $set: {
        contentType,
        approved: true,
      },
    },
  )
  return await db.collection('needleChatMessages').findOne({
    _id: messageId,
  })
}
