import freshId from 'fresh-id'
import { pubsub } from '../../pubsub'
import { maybeCreateFromHexString } from '../../utils'
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
  const { senderId, messageType, sourceType, chatRoomId, createdAt } = message
  if (
    messageType === 'TEXT' &&
    sourceType !== 'FROM_CDE' &&
    sourceType !== 'FROM_PATIENT'
  ) {
    return
  }
  const eventKey = `session_${chatRoomId}`

  let eventExists = !!(await queryDelayEvent(eventKey)).length
  if (eventExists) {
    await deleteDelayEvent(eventKey)
    addDelayEvent(eventKey, delay)
  } else {
    const sender = await db
      .collection('users')
      .findOne({ _id: { $in: [senderId, maybeCreateFromHexString(senderId)] } })
    if (!sender.roles) {
      const newSession = {
        _id: freshId(),
        chatRoomId,
        startAt: createdAt,
        createdAt: new Date(),
      }
      await db.collection('sessions').insert(newSession)
      pubsub.publish('sessionDynamics', {
        newSession,
        _operation: 'ADDED',
      })
      addDelayEvent(eventKey, delay)
    }
  }
}
