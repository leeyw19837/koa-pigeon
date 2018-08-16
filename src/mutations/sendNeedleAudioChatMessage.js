import freshId from 'fresh-id'
import { uploadFile } from '../utils/ks3'
import { pubsub } from '../pubsub'

import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'
export const sendNeedleAudioChatMessage = async (_, args, context) => {
  const db = await context.getDb()

  const { userId, chatRoomId, base64EncodedAudioData, actualSenderId } = args

  let chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (!chatRoom) {
    throw new Error('Can not find chat room')
  }

  const participantObject = chatRoom.participants.map(p => p.userId === userId)

  if (!participantObject) {
    throw new Error('You can not post to chat rooms you are not a member of')
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

  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  const participants = chatRoom.participants.map(p => {
    if (p.userId === userId) {
      return { ...p, lastSeenAt: new Date() }
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
      const user = await db
        .collection('users')
        .findOne({ _id: ObjectID.createFromHexString(p.userId) })
      if (!user.roles) {
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
