import { Db } from 'mongodb'


export const chatMessages = async (_, args, { db }: { db: Db }) => db
  .collection('chatMessages')
  .find({ appointmentId: args.appointmentId })
  .sort({ sentAt: 1 })
  .toArray()
