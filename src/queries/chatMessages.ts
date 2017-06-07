import { Db } from 'mongodb'


export const chatMessages = async (_, args, { db }: { db: Db }) => {
  const messages = await db
    .collection('chatMessages')
    .find({ appointmentId: args.appointmentId })
    .sort({ sentAt: 1 })
    .toArray()

  return {
    messages,
    timestamp: new Date().toISOString(),
  }
}
