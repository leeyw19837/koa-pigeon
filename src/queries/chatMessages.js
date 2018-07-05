export const chatMessages = async (_, args, { getDb }) => {
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
