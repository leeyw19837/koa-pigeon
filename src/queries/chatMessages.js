export const chatMessages = async (_, args, { getDb }) => {
  if (args.patientId) {
    const db = await getDb()

    const appointments = await db.collection('appointments').find({
      patientId: args.patientId
    }).toArray();




    const messages = await db
      .collection('chatMessages')
      .find({
        $or: [
          {
            appointmentId: {
              $in: appointments.map(a => { return a._id })
            }
          },
          {
            patientId: args.patientId
          }
        ]
      })
      .sort({ sentAt: 1 })
      .toArray()

    return {
      messages,
      timestamp: new Date().toISOString(),
    }
  }
  return {
    messages: [],
    timestamp: new Date().toISOString(),
  }
}
