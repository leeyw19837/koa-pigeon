import freshId from 'fresh-id'

export const saveCommunication = async (_, args, { getDb }) => {
  const db = await getDb()
  const {
    patientId,
    currentTopic,
    initiator,
    method,
    nextTopic,
    nextDate,
  } = args

  const newRecord = {
    _id: freshId(),
    patientId,
    currentTopic,
    initiator,
    method,
    nextTopic,
    nextDate: nextDate ? new Date(nextDate) : null,
    createdAt: new Date(),
    createdBy: '66728d10dc75bc6a43052036', // TODO
  }

  await db.collection('communication').insertOne(newRecord)

  return true
}