import { maybeCreateFromHexString } from '../utils'

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

    // TODO(tangweikun) Hard Cord should replace of healthCareProfessional id
    const userId =
      needleChatMessage.senderId === '66728d10dc75bc6a43052036'
        ? needleChatMessage.senderId
        : maybeCreateFromHexString(needleChatMessage.senderId)
    const user = await db.collection('users').findOne({ _id: userId })
    return {
      ...user,
      avatar: user.avatar ? user.avatar :
        needleChatMessage.senderId === '66728d10dc75bc6a43052036'
        ? 'https://prod.gtzh.51ijk.com/imgs/app/avatars/doctor.png'
        : 'https://prod.gtzh.51ijk.com/imgs/app/avatars/patient.png',
    }
  },
  async needleChatRoom(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    return db
      .collection('needleChatRooms')
      .findOne({ _id: needleChatMessage.chatRoomId })
  },
}
