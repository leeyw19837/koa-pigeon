import { ObjectID } from 'mongodb'
import { logger } from '../common'
const { ENABLE_USER_BEHAVIOR } = process.env

export const saveUserBehaviors = async (_, args, context) => {
  const db = await context.getDb()
  const {
    patientId,
    eventName,
    eventNumber,
    sessionId,
    occurredAt,
    deviceContext,
  } = args
  if (!patientId) {
    throw new Error('You must be logged in to update devices')
  }
  const user = await db
    .collection('users')
    .findOne({ _id: ObjectID.createFromHexString(patientId) })
  if (!user) {
    throw new Error(`User: ${patientId} does not exist`)
  }

  const frId = new ObjectID()
  const behaviour = {
    _id: String(frId),
    patientId,
    eventName,
    eventNumber,
    sessionId,
    occurredAt,
  }
  if (eventName === 'OPEN_APP') {
    behaviour.deviceContext = deviceContext
  }
  if (ENABLE_USER_BEHAVIOR) {
    await db.collection('userBehaviors').insert(behaviour)
  }
  logger.log({
    level: 'info',
    message: 'Added user behaviour',
    tag: 'user-behaviour',
    meta: behaviour,
    context,
  })

  return true
}
