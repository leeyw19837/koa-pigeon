export const ChatMessage = {
  __resolveType(obj, context, info) {
    if (obj.messageType === 'TEXT') {
      return 'TextMessage'
    }
    if (obj.messageType === 'AUDIO') {
      return 'AudioMessage'
    }
    if (obj.messageType === 'IMAGE') {
      return 'ImageMessage'
    }
    throw new Error(`Unrecognized chat message type: ${obj.type}`)
  },
}

export const sharedChatMessageResolvers = {
  async sender(chatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()

    if (chatMessage.sender.userType === 'PATIENT') {
      return db.collection('patients').findOne({ _id: chatMessage.sender.userId })
    } else if (chatMessage.sender.userType === 'HEALTH_CARE_PROFESSIONAL') {
      return db.collection('healthCareProfessionals').findOne({ _id: chatMessage.sender.userId })
    } else {
      throw new Error(`Unrecognized userType: ${chatMessage.sender.userType}`)
    }
  },
  async chatRoom(chatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    return db.collection('chatRooms').findOne({ _id: chatMessage.chatRoomId })
  },
}
