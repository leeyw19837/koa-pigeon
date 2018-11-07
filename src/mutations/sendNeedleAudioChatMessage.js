import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import { uploadFile } from '../utils/ks3'
import { pubsub } from '../pubsub'

import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'
import { whoAmI, sessionFeeder } from '../modules/chat'
import { handleReplySms } from '../resolvers/handleReplySms'

export const sendNeedleAudioChatMessage = async (_, args, context) => {
  const db = await context.getDb()

  const {
    userId,
    chatRoomId,
    base64EncodedAudioData,
    actualSenderId,
    nosy,
  } = args

  const userObjectId = ObjectId.createFromHexString(userId)

  let chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (!chatRoom) {
    throw new Error('Can not find chat room')
  }

  // 等聊天室成员数据清洗完再做这个检查
  // const participantObject = chatRoom.participants.find(p => p.userId === userId)
  // if (!participantObject) {
  //   throw new Error('You can not post to chat rooms you are not a member of')
  // }
  const participant = await whoAmI(
    actualSenderId || userId,
    nosy,
    chatRoom.participants,
    db,
  )

  const sender = await db
    .collection('users')
    .findOne({ _id: { $in: [userId, userObjectId] } }, { roles: 1 })
  const isAssistant = sender.roles === '医助'

  if (isAssistant) {
    const patientParticipants = chatRoom.participants.find(user => {
      return user.role === '患者'
    })
    await handleReplySms(chatRoomId, patientParticipants)
  }

  const audioUrlKey = `${userId}${Date.now()}`
  const audioUrl = await uploadFile(audioUrlKey, base64EncodedAudioData)

  const newChatMessage = {
    _id: freshId(),
    messageType: 'AUDIO',
    audioUrl,
    senderId: userId,
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
  }
  if (actualSenderId) {
    newChatMessage.actualSenderId = actualSenderId
  }
  await db.collection('needleChatMessages').insertOne(newChatMessage)
  await sessionFeeder(newChatMessage, db)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  const participants = chatRoom.participants.map(p => {
    if (p.userId === participant.userId) {
      return { ...p, lastSeenAt: new Date(), unreadCount: 0 }
    } else if (p.userId !== participant.userId) {
      return { ...p, unreadCount: (p.unreadCount || 0) + 1 }
    }
    return p
  })
  await db.collection('needleChatRooms').update(
    {
      _id: chatRoomId,
    },
    {
      $set: {
        participants,
        lastMessageSendAt: new Date(),
      },
    },
  )
  chatRoom = await db.collection('needleChatRooms').findOne({ _id: chatRoomId })

  pubsub.publish('chatRoomDynamics', chatRoom)

  chatRoom.participants.map(async p => {
    if (p.userId !== userId) {
      const user = await db.collection('users').findOne({
        _id: { $in: [ObjectID.createFromHexString(p.userId), p.userId] },
      })
      if (user && !user.roles) {
        pushChatNotification({
          patient: user,
          messageType: 'AUDIO',
          db,
        })
      }
    }
  })

  return newChatMessage
}
