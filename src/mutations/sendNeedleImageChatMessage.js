import freshId from 'fresh-id'
import { uploadBase64Img } from '../utils/ks3'
import { pubsub } from '../pubsub'

import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'
import { whoAmI } from '../modules/chat'

const sourceTypesProCare = ['FROM_CDE', 'FROM_PATIENT', 'SMS', 'WECHAT']
export const sendNeedleImageChatMessage = async (_, args, context) => {
  const db = await context.getDb()

  const {
    userId,
    chatRoomId,
    base64EncodedImageData,
    actualSenderId,
    nosy,
  } = args

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
  const imageUrlKey = `${userId}${Date.now()}`
  const imageUrl = await uploadBase64Img(imageUrlKey, base64EncodedImageData)
  const newChatMessage = {
    _id: freshId(),
    messageType: 'IMAGE',
    imageUrl,
    senderId: userId,
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
    sourceType: args.sourceType ? args.sourceType : 'FROM_COMMON_CHAT',
  }
  if (actualSenderId) {
    newChatMessage.actualSenderId = actualSenderId
  }
  await db.collection('needleChatMessages').insertOne(newChatMessage)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  const participants = chatRoom.participants.map(p => {
    if (p.userId === participant.userId) {
      return { ...p, lastSeenAt: new Date(), unreadCount: 0 }
    } else if (p.userId !== participant.userId) {
      return { ...p, unreadCount: (participant.unreadCount || 0) + 1 }
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
          messageType: 'IMAGE',
          db,
        })
      }
    }
  })

  return newChatMessage
}
