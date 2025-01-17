import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'
import { whoAmI, sessionFeeder } from '../modules/chat'
import { categories, classify, qa } from '../modules/AI'
import { handleReplySms } from '../resolvers/handleReplySms'

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

const sourceTypesProCare = ['FROM_CDE', 'FROM_PATIENT', 'SMS', 'WECHAT']

export const sendNeedleTextChatMessage = async (_, args, { getDb }) => {
  const db = getDb === undefined ? global.db : await getDb()

  let {
    userId,
    chatRoomId,
    text,
    sourceType,
    contentCode,
    bgRecordId,
    messagesPatientReplyFlag,
    actualSenderId,
    nosy,
    messageType,
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

  // 待APP升级按新的规则sourceType和contentCode过来以后，可以移除这个if块
  if (/_\d+$/.test(sourceType)) {
    contentCode = sourceType
    sourceType = 'FROM_FOREST'
    if(participant.role !== '患者')
      actualSenderId='system'
  }

  const sender = await db
    .collection('users')
    .findOne({ _id: { $in: [userId, userObjectId] } }, { roles: 1 })
  const isAssistant = sender.roles === '医助' || sender.roles === '超级护理师'
  const isPatient = !sender.roles

  if (isAssistant) {
    const patientParticipants = chatRoom.participants.find(user => {
      return user.role === '患者'
    })
    await handleReplySms(chatRoomId, patientParticipants)
  }

  let chatMessageCount = await db
    .collection('needleChatMessages')
    .find({ senderId: userId })
    .count()

  const sourceTypeMap = isAssistant ? 'FROM_CDE' : 'FROM_PATIENT'

  const newChatMessage = {
    _id: freshId(),
    messageType: 'TEXT',
    text,
    senderId: userId,
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
    sourceType: sourceType || sourceTypeMap,
  }
  if (contentCode) {
    newChatMessage.contentCode = contentCode
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

  if (process.env.AI === 'true' && participant && participant.role === '患者') {
    // messaged by patient, do AI interface call.
    newChatMessage.contentType = await classify(newChatMessage.text)
    newChatMessage.approved = false
  }

  await db.collection('needleChatMessages').insertOne(newChatMessage)
  await sessionFeeder(newChatMessage, db)
  newChatMessage.options = []
  if (process.env.AI === 'true' && participant && participant.role === '患者') {
    newChatMessage.options = await categories()
    newChatMessage.intelligentQA = await qa(newChatMessage.text)
    // console.log(JSON.stringify(newChatMessage.intelligentQA))
  }
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })
  const assistant = chatRoom.participants.find(p => p.role === '医助' || p.role === '超级护理师')
  if (isPatient && chatMessageCount === 0 && assistant) {
    if (text === '你好' || text === '您好') {
      const newChatMessageAutoReplied = {
        _id: freshId(),
        messageType: 'TEXT',
        text: '欢迎您加入共同照护门诊，请问有什么能帮您的吗？',
        senderId: assistant.userId,
        actualSenderId: 'system',
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
    if (/system/i.test(actualSenderId)) {
      if (p.role === '患者')
        return { ...p, unreadCount: (p.unreadCount || 0) + 1 }
      return p
    }
    // 如果是系统自动回复的话，照护师的未读数不应该消失
    if (p.userId === participant.userId && !sourceTypeRegex.test(sourceType)) {
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
          messageType: 'TEXT',
          text,
          db,
        })
      }
    }
  })

  return newChatMessage
}
