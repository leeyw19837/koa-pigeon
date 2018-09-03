import { pubsub } from '../pubsub'
import { deleteDelayEvent } from '../redisCron/controller'

export const finishSession = async (_, { chatRoomId }, { getDb }) => {
  const db = await getDb()
  await db.collection('sessions').update(
    {
      chatRoomId,
      endAt: null,
    },
    {
      $set: { endAt: new Date() },
    },
  )
  const sessions = await db
    .collection('sessions')
    .find({ chatRoomId })
    .sort({ endAt: -1 })
    .toArray()
  if (sessions.length) {
    pubsub.publish('sessionDynamics', {
      ...sessions[0],
      _operation: 'UPDATED',
    })
  }

  await deleteDelayEvent(`pigeon__session_${chatRoomId}`)
  const room = await db.collection('needleChatRooms').findOne({
    _id: chatRoomId,
  })
  let { participants } = room
  participants = participants.map(p => {
    if (p.role !== '医助') return p
    return {
      ...p,
      lastSeenAt: new Date(),
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
  return true
}
