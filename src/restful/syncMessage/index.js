import { ObjectID } from 'mongodb'
import { sendNeedleTextChatMessage } from '../../mutations/sendNeedleTextChatMessage'

const findPatientByUsername = async ({ username, sourceType }) => {
  const cursor = { needleChatRoomId: { $exists: true } }
  if (sourceType === 'SMS') {
    cursor.username = username
  } else if (sourceType === 'WECHAT') {
    cursor['wechatInfo.openid'] = username
  }
  const user = await db.collection('users').findOne(cursor)
  return user
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
    await sendNeedleTextChatMessage(null, args, {})
  } else {
    await insertEvent({
      username,
      content,
      sourceType,
    })
  }
}
