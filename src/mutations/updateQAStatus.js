export const updateQAStatus = async (_, args, { getDb }) => {
  const db = await getDb()
  //updateQAStatus
  const { qaId, approved } = args
  await db.collection('aiChatQA').update(
    {
      _id: qaId,
    },
    {
      $set: {
        approved,
      },
    },
  )
  return true
}
