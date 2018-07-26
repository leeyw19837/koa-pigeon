export const saveChatMessage = async (_, args, { getDb }) => {
  const db = await getDb()

  const { content, sentAtString, patientId, senderNickname } = args

  const chatMessage = {
    content,
    sentAt: new Date(sentAtString),
    patientId,
    senderNickname,
  }

  await db.collection('chatMessages').insertOne(chatMessage)

  return true
}
