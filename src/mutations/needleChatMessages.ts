import { IContext } from '../types'

export const updateLastSeenAt = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  const { chatRoomId, userId } = args

  const chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (chatRoom) {
    const { participants } = chatRoom
    const index = participants.findIndex(item => item.userId === userId)

    await db
      .collection('needleChatRooms')
      .update(
        { _id: chatRoomId },
        { $set: { [`participants.${index}.lastSeenAt`]: new Date() } },
      )
  }

  return true
}
