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
    const now = new Date()
    const newRecord = {
      _id: freshId(),
      patientId,
      currentTopic,
      initiator,
      method,
      nextTopic,
      nextDate: nextDate ? new Date(nextDate) : null,
      createdAt: now,
      createdBy: '66728d10dc75bc6a43052036', // TODO
    }
    await db.collection('communication').insertOne(newRecord)

    await db.collection('outreachs').update({
      patientId,
      status: 'PENDING',
      appointmentTime: {$lt: now}
    }, {$set: {status: 'PROCESSED'}})

    if (nextDate) {
      const newOutreachs = {
        _id: freshId(),
        patientId,
        status: 'PENDING',
        source: ['COMMUNICATION'],
        plannedDate: new Date(nextDate),
        createdAt: now,        
      }
      await db.collection('outreachs').insertOne(newOutreachs)
    }
  } else {
    const $set = { currentTopic, initiator, method, nextTopic, updatedAt: now }
    await db.collection('communication').update({ _id }, { $set })
  }
  

  return true
}