export const chatMessages = async (_, args, { getDb }) => {
  const db = await getDb()

  const appointment = (await db.collection('appointments').find({
    _id: args.appointmentId
  }).toArray())[0];

  // console.log(appointment)

  const appointments = await db.collection('appointments').find({
    patientId: appointment.patientId
  }).toArray();




  const messages = await db
    .collection('chatMessages')
    .find({
      appointmentId: {
        $in: appointments.map(a => { return a._id })
      }
    })
    .sort({ sentAt: 1 })
    .toArray()

  return {
    messages,
    timestamp: new Date().toISOString(),
  }
}
