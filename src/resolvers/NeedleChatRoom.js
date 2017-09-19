import { maybeCreateFromHexString } from '../utils'

export const NeedleChatRoom = {
  async participants(needleChatRoom, _, { getDb }) {
    const db = await getDb()

    let users = []

    for (const participant of needleChatRoom.participants) {
      const patient = await db
        .collection('users')
        .findOne({ _id: maybeCreateFromHexString(participant.userId) })
      users.push(patient)
    }

    return users
  },
  async messages(needleChatRoom, args, { getDb }) {
    const db = await getDb()

    const { before = new Date('2999/01/01'), limit } = args

    const messages = await db
      .collection('needleChatMessages')
      .find({
        chatRoomId: needleChatRoom._id,
        createdAt: { $lt: new Date(before) },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return messages.reverse()
  },
  // async latestMessage(chatRoom, _, { getDb }) {
  //   const db = await getDb()
  //   const messageArray = await db
  //     .collection('needleChatMessages')
  //     .find({ chatRoomId: chatRoom._id })
  //     .sort({ createdAt: -1 })
  //     .limit(1)
  //     .toArray()
  //   return messageArray[0] || null
  // },
  // async unreadMessageCount(chatRoom, _, context) {
  //   const { userId } = context.state
  //   const db = await context.getDb()
  //   const me = chatRoom.participants.find(user => {
  //     return user.userId === userId
  //   })
  //   return await db
  //     .collection('needleChatMessages')
  //     .count({ chatRoomId: chatRoom._id, createdAt: { $gt: me.lastSeenAt } })
  // },
}
