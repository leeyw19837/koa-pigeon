import freshId from 'fresh-id'
import { pubsub } from '../../pubsub'
import { maybeCreateFromHexString } from '../../utils'
import {
  addDelayEvent,
  deleteDelayEvent,
  queryDelayEvent,
} from '../../redisCron/controller'
import { CLIENT_RENEG_LIMIT } from 'tls'

export const whoAmI = async (userId, nosy, participants, db) => {
  let me = participants.find(user => {
    return user.userId === userId
  })
  if (!me) {
    if (nosy) {
      me = participants.find(user => {
        return user.role === '医助'
      })
    } else {
      // 这是一块新屎，有了它nosy参数形同虚设；等participants清洗完以后，再删除掉这个else块
      const user = await db
        .collection('users')
        .findOne({ _id: { $in: [userId, maybeCreateFromHexString(userId)] } })
      if (user && user.roles === '医助') {
        me = participants.find(user => {
          return user.role === '医助'
        })
      }
    }
  }
  return me
}

const delay = 60 * 15
export const sessionFeeder = async (message, db) => {
  const { senderId, messageType, sourceType, chatRoomId, createdAt } = message

  const eventKey = `session_${chatRoomId}`
  const longKey = `pigeon__${eventKey}`

  let eventExists = !!(await queryDelayEvent(eventKey)).length
  if (eventExists) {
    await deleteDelayEvent(longKey)
    addDelayEvent(eventKey, delay)
  } else {
    const now = new Date()
    const sender = await db
      .collection('users')
      .findOne({ _id: { $in: [senderId, maybeCreateFromHexString(senderId)] } })
    let initiator = null
    if (!sender.roles) {
      initiator = 'PATIENT'
    } else if (sender.roles === '医助' && sourceType === 'FROM_CDE') {
      initiator = 'ASSISTANT'
      const processingSession = await db
        .collection('sessions')
        .find({ startAt: { $gte: now }, endAt: null, educatorId: null })
        .sort({ createdAt: -1 })
        .limit(1)
      if (processingSession) {
        await db
          .collection('session')
          .update(
            { _id: processingSession._id },
            { $set: { educatorId: senderId, educatorName: sender.nickname } },
          )
      }
    } else {
      initiator = 'SYSTEM'
    }
    const newSession = {
      _id: freshId(),
      chatRoomId,
      initiator,
      startAt: createdAt,
      createdAt: now,
    }
    if (initiator === 'ASSISTANT') {
      newSession.educatorId = senderId
      newSession.educatorName = sender.nickname
    }
    await db.collection('sessions').insert(newSession)
    pubsub.publish('sessionDynamics', {
      ...newSession,
      _operation: 'ADDED',
    })
    addDelayEvent(eventKey, delay)
  }
}
