export const NeedleChatMessage = {
  __resolveType(obj, context, info) {
    if (obj.messageType === 'TEXT') {
      return 'NeedleTextMessage'
    }
    if (obj.messageType === 'AUDIO') {
      return 'NeedleAudioMessage'
    }
    if (obj.messageType === 'IMAGE') {
      return 'NeedleImageMessage'
    }
    throw new Error(`Unrecognized chat message type: ${obj.type}`)
  },
}

export const sharedNeedleChatMessageResolvers = {
  async sender(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()

    if (needleChatMessage.sender.userType === 'PATIENT') {
      return db
        .collection('patients')
        .findOne({ _id: needleChatMessage.sender.userId })
    } else if (
      needleChatMessage.sender.userType === 'HEALTH_CARE_PROFESSIONAL'
    ) {
      return db
        .collection('healthCareProfessionals')
        .findOne({ _id: needleChatMessage.sender.userId })
    } else {
      throw new Error(`Unrecognized userType: ${chatMessage.sender.userType}`)
    }
  },
  async needleChatRoom(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    return db
      .collection('needleChatRooms')
      .findOne({ _id: needleChatMessage.chatRoomId })
  },
}
