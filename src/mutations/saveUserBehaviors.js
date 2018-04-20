import get from 'lodash/get'
import { ObjectID } from 'mongodb'

export const saveUserBehaviors = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, eventName, eventNumber, occurredAt } = args
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
  await db.collection('userBehaviors').insert({
    _id: String(frId),
    patientId,
    eventName,
    eventNumber,
    occurredAt,
  })
  return true
}
