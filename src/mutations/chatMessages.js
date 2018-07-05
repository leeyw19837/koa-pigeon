export const saveChatMessage = async (_, args, { getDb }) => {
  const db = await getDb()

  const { content, sentAtString, appointmentId, senderNickname } = args

  const chatMessage = {
    content,
    sentAt: new Date(sentAtString),
    appointmentId,
    senderNickname,
  }

  await db.collection('chatMessages').insertOne(chatMessage)

  return true
}
