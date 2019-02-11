import freshId from 'fresh-id'
import { pubsub } from '../../pubsub'
import { maybeCreateFromHexString } from '../../utils'
import first from 'lodash/first'
import { setDelayJob, delDelayJob, isJobExists } from '../delayJob'

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
      if (userId === 'system' || (user && user.roles === '医助')) {
        me = participants.find(user => {
          return user.role === '医助'
        })
      }
    }
  }
  return me
}

const delay = 15 * 60
export const finishSession = async (
  db,
  chatRoomId,
  finishReason,
  { operatorId },
) => {
  const now = new Date()
  if (finishReason !== 'timeout') {
    const room = await db.collection('needleChatRooms').findOne({
      _id: chatRoomId,
    })
    let { participants } = room
    participants = participants.map(p => {
      if (p.role === '患者') return p
      return {
        ...p,
        lastSeenAt: now,
        unreadCount: 0,
      }
    })
    await db.collection('needleChatRooms').update(
      { _id: chatRoomId },
      {
        $set: {
          participants,
        },
      },
    )
    pubsub.publish('chatRoomDynamics', {
      ...room,
      participants,
    })
  }

  let latestSession = await db
    .collection('sessions')
    .find({
      chatRoomId,
    })
    .sort({ startAt: -1 })
    .limit(1)
    .toArray()
  latestSession = first(latestSession)
  if (!latestSession || latestSession.endAt) {
    // 最后一个会话如果不是未结束的，中止
    console.log('no processing session matched')
    if (latestSession && operatorId)
      db.collection('sessions').update(
        { _id: latestSession._id },
        { $push: { eraser: { operatorId, occurAt: new Date() } } },
      )
    return
  }

  const setter = { endAt: now, finishReason }
  const rst = await db.collection('sessions').update(
    {
      _id: latestSession._id,
    },
    {
      $set: setter,
    },
  )
  if (!rst.result.ok) return

  pubsub.publish('sessionDynamics', {
    ...latestSession,
    ...setter,
    _operation: 'UPDATED',
  })

  delDelayJob(`session_${chatRoomId}`)
}

export const sessionFeeder = async (message, db) => {
  const {
    senderId,
    actualSenderId,
    sourceType,
    chatRoomId,
    createdAt,
  } = message

  const jobId = `session_${chatRoomId}`

  let jobExists = isJobExists(jobId)
  const now = new Date()
  const actualId = actualSenderId || senderId
  const actualSender =
    actualId === 'system'
      ? actualId
      : await db.collection('users').findOne({
          _id: { $in: [actualId, maybeCreateFromHexString(actualId)] },
        })

  if (jobExists) {
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
    setDelayJob(jobId, () => finishSession(db, chatRoomId, 'timeout'), delay)
  } else {
    let initiator = null
    if (actualSender !== 'system' && !actualSender.roles) {
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
    setDelayJob(jobId, () => finishSession(db, chatRoomId, 'timeout'), delay)
  }
}

export const correctSessions = async db => {
  const processingSessions = await db
    .collection('sessions')
    .find({
      endAt: null,
    })
    .sort({ startAt: 1 })
    .toArray()
  for (let i = 0; i < processingSessions.length; i++) {
    const { _id, startAt, chatRoomId } = processingSessions[i]
    let nextSession = await db
      .collection('sessions')
      .find({ chatRoomId, startAt: { $gt: startAt } })
      .sort({ startAt: 1 })
      .limit(1)
      .toArray()
    if (nextSession.length) {
      const { startAt } = nextSession[0]
      await db.collection('sessions').update(
        { _id },
        {
          $set: {
            endAt: startAt,
            finishReason: 'timeout',
            info: 'correct when reboot',
          },
        },
      )
    } else {
      const jobId = `session_${chatRoomId}`
      setDelayJob(jobId, () => finishSession(db, chatRoomId, 'timeout'), delay)
    }
  }
}
