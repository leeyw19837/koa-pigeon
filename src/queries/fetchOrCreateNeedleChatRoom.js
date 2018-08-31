import freshId from 'fresh-id'
import { uploadFile } from '../utils/ks3'
import { maybeCreateFromHexString } from '../utils'
import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'

export const fetchOrCreateNeedleChatRoom = async (_, args, context) => {
  const db = await context.getDb()

  const { userId } = args

  const userObjectId = ObjectId.createFromHexString(userId)

  const user = await db.collection('users').findOne({
    _id: userId === '66728d10dc75bc6a43052036' ? userId : userObjectId,
  })
  let chatRoom
  if (user.needleChatRoomId) {
    chatRoom = await db
      .collection('needleChatRooms')
      .findOne({ _id: user.needleChatRoomId })
  } else {
    chatRoom = {
      _id: freshId(),
      participants: [
        {
          userId,
          role: user.roles || '患者',
          lastSeenAt: new Date(),
          unreadCount: 0,
        },
        {
          userId: '66728d10dc75bc6a43052036',
          role: '医助',
          lastSeenAt: new Date(),
          unreadCount: 0,
        },
      ],
      lastMessageSendAt: new Date('2000-01-01'),
    }
    await db.collection('needleChatRooms').insertOne(chatRoom)
    if (userId !== '66728d10dc75bc6a43052036') {
      await db
        .collection('users')
        .update(
          { _id: userObjectId },
          { $set: { needleChatRoomId: chatRoom._id } },
        )
    }

    pubsub.publish('chatRoomDynamics', chatRoom)
  }
  return chatRoom
}

export const unreadMessages = async (_, args, context) => {
  const db = await context.getDb()
  const { userId } = args
  const userObjectId = ObjectId.createFromHexString(userId)
  const user = await db.collection('users').findOne({ _id: userObjectId })

  if (user) {
    const { needleChatRoomId } = user
    const chatRoom = await db
      .collection('needleChatRooms')
      .findOne({ _id: needleChatRoomId })

    if (chatRoom) {
      const { participants } = chatRoom
      const me = participants.find(item => item.userId === userId) || {}
      const { lastSeenAt = new Date() } = me

      const count = await db.collection('needleChatMessages').count({
        chatRoomId: needleChatRoomId,
        senderId: { $ne: userId },
        createdAt: { $gt: lastSeenAt },
      })
      return {
        count,
        chatRoomId: needleChatRoomId,
      }
    }
  }
  return null
}

export const getChatrooms = async (
  _,
  { nosy, cdeId, page, limit },
  { getDb },
) => {
  if (!nosy && !cdeId) {
    return
  }
  const db = await getDb()
  let condition = {}
  if (!nosy && cdeId) {
    let patientsIds = await db
      .collection('users')
      .find(
        { cdeId, patientState: { $nin: ['REMOVED', 'ARCHIVED'] } },
        { _id: 1 },
      )
      .toArray()
    patientsIds = patientsIds.map(p => p._id.toString())
    condition = {
      participants: {
        $elemMatch: { userId: { $in: patientsIds }, role: '患者' },
      },
    }
  } else if (nosy) {
    let patientsIds = await db
      .collection('users')
      .find({ patientState: { $nin: ['REMOVED', 'ARCHIVED'] } }, { _id: 1 })
      .toArray()
    patientsIds = patientsIds.map(p => p._id.toString())
    condition = {
      participants: {
        $elemMatch: { userId: { $in: patientsIds }, role: '患者' },
      },
    }
  } else {
    return null
  }
  const chatrooms = await db
    .collection('needleChatRooms')
    .find(condition)
    .sort({ lastMessageSendAt: -1 })
    .skip(page * limit)
    .limit(limit)
    .toArray()
  return chatrooms
}
