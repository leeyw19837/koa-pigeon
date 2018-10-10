import get from 'lodash/get'
import { ObjectID } from 'mongodb'
import { logger } from '../lib/logger';

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
    throw new Error( `User: ${patientId} does not exist`)
  }

  const frId = new ObjectID()
  if (eventName === 'OPEN_APP') {
    const { deviceContext } = args
    const behaviour = {
      _id: String(frId),
      patientId,
      eventName,
      eventNumber,
      sessionId,
      deviceContext,
      occurredAt,
    }
    await db.collection('userBehaviors').insert(behaviour)
    logger.log({level: 'info', message: 'Added user behaviour', tag: 'user-behaviour', meta: behaviour })
    return true
  }
  const behaviour = {
    _id: String(frId),
    patientId,
    eventName,
    eventNumber,
    sessionId,
    occurredAt,
  }
  await db.collection('userBehaviors').insert(behaviour)
  logger.log({level: 'info', message: 'Added user behaviour', tag: 'user-behaviour', meta: behaviour })
  return true
}
