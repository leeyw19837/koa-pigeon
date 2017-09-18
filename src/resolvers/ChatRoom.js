export const ChatRoom = {
  async participants(chatRoom, _, { getDb }) {
    const db = await getDb()

    let users = []

    for (const participant of chatRoom.participants) {
      if (participant.userType === 'PATIENT') {
        const patient = await db.collection('patients').findOne({ _id: participant.userId })
        users.push(patient)
      } else if (participant.userType === 'HEALTH_CARE_PROFESSIONAL') {
        const healthCareProfessional = await db
          .collection('healthCareProfessionals')
          .findOne({ _id: participant.userId })
        users.push(healthCareProfessional)
      } else {
        throw new Error(`Unrecognized userType: ${participant.userType}`)
      }
    }

    return users
  },
  async messages(chatRoom, args, { getDb }) {
    const db = await getDb()

    const { before, limit } = args
    const messages = await db
      .collection('chatMessages')
      .find({ chatRoomId: chatRoom._id, createdAt: { $lt: before } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return messages.reverse()
  },
  async latestMessage(chatRoom, _, { getDb }) {
    const db = await getDb()
    const messageArray = await db
      .collection('chatMessages')
      .find({ chatRoomId: chatRoom._id })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    return messageArray[0] || null
  },
  async unreadMessageCount(chatRoom, _, context) {
    const { userId } = context.state
    const db = await context.getDb()
    const me = chatRoom.participants.find(user => {
      return user.userId === userId
    })
    return await db
      .collection('chatMessages')
      .count({ chatRoomId: chatRoom._id, createdAt: { $gt: me.lastSeenAt } })
  },
}
