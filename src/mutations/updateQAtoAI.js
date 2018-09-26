export const updateQAtoAI = async (_, args, context) => {
  const { getDb } = context
  const db = await getDb()
  const { qaId, q, a, approvedUser, approvedUserId } = args
  // update QA
  await db.collection('aiChatQA').update(
    {
      _id: qaId,
    },
    {
      $set: {
        approved: 1,
        approvedUser,
        approvedUserId,
        q,
        a,
        approvedAt: new Date(),
      },
    },
  )

  // Push new QA to Tianjin guys
  context.response.set('effect-types', 'QAAddition')
  return true
}
