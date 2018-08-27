import { pubsub } from '../pubsub'

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
          [`participants.${index}`]: {
            lastSeenAt: new Date(),
            unreadCount: 0,
          },
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
