import { pubsub } from '../pubsub'
import moment from 'moment'

export const updateLastSeenAt = async (_, args, { getDb }) => {
  const db = await getDb()

  const { chatRoomId, userId } = args

  let chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (chatRoom) {
    const { participants } = chatRoom

    const index = participants.findIndex(item => item.userId === userId)

    await db.collection('needleChatRooms').update(
      { _id: chatRoomId },
      {
        $set: {
          [`participants.${index}.lastSeenAt`]: new Date(),
          [`participants.${index}.unreadCount`]: 0,
        },
      },
    )

    chatRoom = await db
      .collection('needleChatRooms')
      .findOne({ _id: chatRoomId })
    pubsub.publish('chatRoomDynamics', chatRoom)
  }

  return true
}

export const withdrawMessage = async (_, args, { getDb }) => {
  const db = await getDb()
  const { messageId, userId } = args
  const message = await db
    .collection('needleChatMessages')
    .findOne({ _id: messageId })
  if (!message) return
  const isMessageSender =
    userId === message.senderId || userId === message.actualSenderId
  if (!isMessageSender) {
    throw new Error('您只能撤回自己发送的消息')
  }

  const isOverTime = moment().diff(moment(message.createdAt), 'm') > 2
  if (isOverTime) {
    throw new Error('消息已发出超过两分钟')
  }
  await db
    .collection('needleChatMessages')
    .update(
      { _id: messageId },
      { $set: { status: 'WITHDRAWN', editorId: userId } },
    )
  pubsub.publish('chatMessageUpdated', {
    chatMessageUpdated: {
      ...message,
      status: 'WITHDRAWN',
      editorId: userId,
    },
  })

  return true
}
