import freshId from 'fresh-id'
import { pubsub } from '../../pubsub'
import { maybeCreateFromHexString } from '../../utils'
import first from 'lodash/first'
import {
  addDelayEvent,
  deleteDelayEvent,
  queryDelayEvent,
} from '../../redisCron/controller'

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
  const {
    senderId,
    actualSenderId,
    sourceType,
    chatRoomId,
    createdAt,
  } = message

  const eventKey = `session_${chatRoomId}`
  const longKey = `pigeon__${eventKey}`

  let eventExists = !!(await queryDelayEvent(eventKey)).length
  const now = new Date()
  const actualId = actualSenderId || senderId
  const actualSender = await db
    .collection('users')
    .findOne({ _id: { $in: [actualId, maybeCreateFromHexString(actualId)] } })

  if (eventExists) {
    let processingSession = await db
      .collection('sessions')
      .find({
        chatRoomId,
        startAt: { $lte: now },
        endAt: null,
        educatorId: null,
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    processingSession = first(processingSession)
    if (
      processingSession &&
      !!actualSender.roles &&
      sourceType === 'FROM_CDE'
    ) {
      const educator = {
        educatorId: actualId,
        educatorName: actualSender.nickname,
      }
      await db
        .collection('sessions')
        .update({ _id: processingSession._id }, { $set: educator })
      pubsub.publish('sessionDynamics', {
        ...processingSession,
        ...educator,
        _operation: 'UPDATED',
      })
    }
    await deleteDelayEvent(longKey)
    addDelayEvent(eventKey, delay)
  } else {
    let initiator = null
    if (!actualSender.roles) {
      initiator = 'PATIENT'
    } else if (actualSender.roles === '医助' && sourceType === 'FROM_CDE') {
      initiator = 'ASSISTANT'
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
      newSession.educatorId = actualId
      newSession.educatorName = actualSender.nickname
    }
    await db.collection('sessions').insert(newSession)
    pubsub.publish('sessionDynamics', {
      ...newSession,
      _operation: 'ADDED',
    })
    addDelayEvent(eventKey, delay)
  }
}
