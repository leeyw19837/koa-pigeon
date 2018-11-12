import { ObjectID } from 'mongodb'
import { sendNeedleTextChatMessage } from '../../mutations/sendNeedleTextChatMessage'

const findPatientByUsername = async ({ username, sourceType }) => {
  const cursor = { needleChatRoomId: { $exists: true } }
  if (sourceType === 'WECHAT') {
    cursor['wechatInfo.openid'] = username
  } else {
    cursor.username = username
  }
  const user = await db.collection('users').findOne(cursor)
  return user
}

const findAssistantInChatroom = async ({ needleChatRoomId }) => {
  const room = await db
    .collection('needleChatRooms')
    .findOne({ _id: needleChatRoomId })
  if (!room) return

  const assistant = room.participants.find(p => p.role === '医助')
  if (!assistant) return
  return assistant.userId
}

const insertEvent = async body => {
  await db.collection('event').insert({
    _id: new ObjectID(),
    eventType: 'message/send',
    ...body,
    createdAt: new Date(),
  })
}

export const syncMessageFromOtherSide = async ({
  username,
  content,
  sourceType,
}) => {
  const user = await findPatientByUsername({ username, sourceType })
  if (user) {
    let { _id, needleChatRoomId } = user
    const patientId = _id.toString()
    if (!needleChatRoomId) {
      needleChatRoomId = freshId()
      await db.collection('needleChatRooms').inert({
        _id: needleChatRoomId,
        participants: [
          {
            userId: patientId,
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
      })
      await db
        .collection('users')
        .update({ _id }, { $set: { needleChatRoomId } })
    }
    const args = {
      userId: patientId,
      chatRoomId: needleChatRoomId,
      text: content,
      sourceType,
    }
    if (sourceType === 'FROM_RAVEN') {
      const assistantId = await findAssistantInChatroom({ needleChatRoomId })
      if (!assistantId) return
      args.userId = assistantId
      args.actualSenderId = 'system'
    }
    await sendNeedleTextChatMessage(null, args, {})
  } else if (sourceType !== 'FROM_RAVEN') {
    await insertEvent({
      username,
      content,
      sourceType,
    })
  }
}
