import { IContext } from '../types'


export const chatMessages = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

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
