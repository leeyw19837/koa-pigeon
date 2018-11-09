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
    const { _id, needleChatRoomId } = user
    const patientId = _id.toString()

    const args = {
      userId: patientId,
      chatRoomId: needleChatRoomId,
      text: content,
      sourceType,
    }
    if (sourceType === 'FROM_RAVEN') {
      const assistantId = await findAssistantInChatroom({ needleChatRoomId })
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
