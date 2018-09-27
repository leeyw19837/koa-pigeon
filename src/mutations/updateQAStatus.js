export const updateQAStatus = async (_, args, { getDb }) => {
  const db = await getDb()
  //updateQAStatus
  const { qaId, approved, approvedUser, approvedUserId } = args
  await db.collection('aiChatQA').update(
    {
      _id: qaId,
    },
    {
      $set: {
        approved,
        approvedUser,
        approvedUserId,
        approvedAt: new Date(),
      },
    },
  )
  return true
}
