import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'

const sourceTypeGroup = [
  'LG',
  'G7FOral',
  'G7FBasal',
  'G10P1',
  'G10P2',
  'G10S',
  'MANUAL_USE_BG_1',
  'MANUAL_NOT_USE_BG_2',
  'AM2H_1',
  'BOP',
]

export const sendNeedleTextChatMessage = async (_, args, { getDb }) => {
  const db = getDb === undefined ? global.db : await getDb()

  const {
    userId,
    chatRoomId,
    text,
    sourceType,
    bgRecordId,
    messagesPatientReplyFlag,
    actualSenderId,
  } = args

  // console.log('chatMessageCount args', args)

  const userObjectId = ObjectId.createFromHexString(userId)

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

  let chatMessageCount =
    userId === '66728d10dc75bc6a43052036'
      ? -1
      : await db
          .collection('needleChatMessages')
          .find({ senderId: userId })
          .count()
  console.log('chatMessageCount', chatMessageCount)

  const sourceTypeMap =
    userId === '66728d10dc75bc6a43052036' ? 'FROM_CDE' : 'FROM_PATIENT'

  const newChatMessage = {
    _id: freshId(),
    messageType: 'TEXT',
    text,
    senderId: userId,
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
    sourceType: sourceType || sourceTypeMap,
  }
  if (actualSenderId) {
    newChatMessage.actualSenderId = actualSenderId
  }
  if (bgRecordId) {
    newChatMessage.bgRecordId = bgRecordId
  }

  if (messagesPatientReplyFlag) {
    newChatMessage.messagesPatientReplyFlag = messagesPatientReplyFlag
  }

  await db.collection('needleChatMessages').insertOne(newChatMessage)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  if (chatMessageCount === 0) {
    if (text === '你好' || text === '您好') {
      const newChatMessageAutoReplied = {
        _id: freshId(),
        messageType: 'TEXT',
        text: '欢迎您加入共同照护门诊，请问有什么能帮您的吗？',
        senderId: '66728d10dc75bc6a43052036',
        createdAt: new Date(),
        chatRoomId: chatRoom._id,
        sourceType: 'greeting',
      }
      await db
        .collection('needleChatMessages')
        .insertOne(newChatMessageAutoReplied)
      pubsub.publish('chatMessageAdded', {
        chatMessageAdded: newChatMessageAutoReplied,
      })
    }
  }
  const sourceTypeRegex = new RegExp(sourceTypeGroup.join('|'), 'i')
  const participants = chatRoom.participants.map(p => {
    if (p.userId === userId) {
      // 如果是系统自动回复的话，照护师的未读数不应该消失
      if (
        p.userId === '66728d10dc75bc6a43052036' &&
        sourceTypeRegex.test(sourceType)
      ) {
        return p
      }
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
      },
    },
  )
  chatRoom = await db.collection('needleChatRooms').findOne({ _id: chatRoomId })

  pubsub.publish('chatRoomDynamics', chatRoom)

  chatRoom.participants.map(async p => {
    if (p.userId !== userId) {
      const user = await db.collection('users').findOne({
        $or: [
          {
            _id: ObjectID.createFromHexString(p.userId),
          },
          { _id: p.userId },
        ],
      })
      if (!user.roles) {
        pushChatNotification({
          patient: user,
          messageType: 'TEXT',
          text,
          db,
        })
      }
    }
  })

  return newChatMessage
}
