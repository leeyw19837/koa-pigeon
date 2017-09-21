import { maybeCreateFromHexString } from '../utils'

export const NeedleChatRoom = {
  async participants(needleChatRoom, _, { getDb }) {
    const db = await getDb()

    let users = []

    for (const participant of needleChatRoom.participants) {
      // TODO(tangweikun) Hard Cord should replace of healthCareProfessional id
      if (participant.userId === '66728d10dc75bc6a43052036') {
        const healthCareProfessional = await db
          .collection('users')
          .findOne({ _id: participant.userId })
        users.push(healthCareProfessional)
      } else {
        const patient = await db
          .collection('users')
          .findOne({ _id: maybeCreateFromHexString(participant.userId) })
        users.push(patient)
      }
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
  async latestMessage(needleChatRoom, _, { getDb }) {
    const db = await getDb()
    const messageArray = await db
      .collection('needleChatMessages')
      .find({ chatRoomId: needleChatRoom._id })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    return messageArray[0] || null
  },
  async unreadMessageCount(needleChatRoom, args, context) {
    const db = await context.getDb()
    const me = needleChatRoom.participants.find(user => {
      return user.userId === args.userId
    })
    return await db
      .collection('needleChatMessages')
      .count({ chatRoomId: needleChatRoom._id, createdAt: { $gt: me.lastSeenAt } })
  },
  async lastSeenAt(needleChatRoom, args, context) {
    const me = needleChatRoom.participants.find(user => {
      return user.userId === args.userId
    })
    return me && me.lastSeenAt
  }
}
