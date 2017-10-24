import freshId from 'fresh-id'

export const saveCommunication = async (_, args, { getDb }) => {
  const db = await getDb()
  const {
    _id,
    patientId,
    currentTopic,
    initiator,
    method,
    nextTopic,
    nextDate,
  } = args
  if (!_id){
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
    if (nextDate) {
      const newOutreachs = {
        _id: freshId(),
        patientId,
        isHandle: false,
        source: ['communication'],
        plannedDate: new Date(nextDate),
        createdAt: new Date(),        
      }
      await db.collection('outreachs').insertOne(newOutreachs)
    }
  } else {
    const $set = { currentTopic, initiator, method, nextTopic, updatedAt: new Date() }
    await db.collection('communication').update({ _id }, { $set })
  }
  

  return true
}