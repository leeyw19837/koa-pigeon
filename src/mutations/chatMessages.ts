import { Db } from 'mongodb'


export const saveChatMessage = async (_, args, { db }: { db: Db }) => {
  const {
    _id,
    content,
    sentAtString,
    appointmentId,
    senderNickname,
  } = args

  const chatMessage = {
    _id,
    content,
    sentAt: new Date(sentAtString),
    appointmentId,
    senderNickname,
  }

  await db.collection('chatMessages').insertOne(chatMessage)

  return true
}
