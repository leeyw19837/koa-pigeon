import freshId from 'fresh-id'
const moment = require('moment')

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
      nextDate: nextDate ? moment(nextDate).startOf('day')._d : null,
      createdAt: now,
      createdBy: '66728d10dc75bc6a43052036', // TODO
    }
    await db.collection('communication').insertOne(newRecord)

    const startOfToday = moment(now).startOf('d')._d
    await db.collection('outreachs').update({
      patientId,
      status: 'PENDING',
      // appointmentTime: {$gte: startOfToday} // 与水清沟通后决定先去除
    }, {$set: {status: 'PROCESSED'}})

    if (nextDate) {
      const newOutreachs = {
        _id: freshId(),
        patientId,
        status: 'PENDING',
        source: ['communication'],
        plannedDate: moment(nextDate).startOf('day')._d,
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