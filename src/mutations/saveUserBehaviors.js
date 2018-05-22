import get from 'lodash/get'
import { ObjectID } from 'mongodb'

export const saveUserBehaviors = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, eventName, eventNumber, sessionId, occurredAt } = args
  if (!patientId) {
    throw new Error('You must be logged in to update devices')
  }
  const user = await db
    .collection('users')
    .findOne({ _id: ObjectID.createFromHexString(patientId) })
  if (!user) {
    throw new Error("You don't exist")
  }

  const frId = new ObjectID()
  if (eventName === 'OPEN_APP') {
    const { deviceContext } = args
    await db.collection('userBehaviors').insert({
      _id: String(frId),
      patientId,
      eventName,
      eventNumber,
      sessionId,
      deviceContext,
      occurredAt,
    })
    return true
  }
  await db.collection('userBehaviors').insert({
    _id: String(frId),
    patientId,
    eventName,
    eventNumber,
    sessionId,
    occurredAt,
  })
  return true
}
