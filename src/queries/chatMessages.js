import moment from 'moment';
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

    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        msg.sentAt = moment(msg.sentAt).format('YY-MM-DD HH:mm')
      })
    }

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
