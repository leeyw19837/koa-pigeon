import freshId from 'fresh-id'

export const saveNewQA = async (_, args, context) => {
  const db = await context.getDb()
  // 把qa保存起来
  const { q, a, msgId, cde } = args
  await db.collection('aiChatQA').insertOne({
    _id: freshId(),
    q,
    a,
    msgId,
    cde,
    approved: false,
    approvedUser: null,
    createdAt: new Date(),
    approvedAt: null,
  })
  return true
}
