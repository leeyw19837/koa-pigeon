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
    if (obj.messageType === 'CARD') {
      return 'NeedleCardMessage'
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
    if (user) {
      return {
        ...user,
        avatar: user.avatar
          ? user.avatar
          : needleChatMessage.senderId === '66728d10dc75bc6a43052036'
            ? 'https://prod.gtzh.51ijk.com/imgs/app/avatars/doctor.png'
            : user.gender === 'male'
              ? 'http://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
              : 'http://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png',
      }
    }
    return {
      _id: '',
      nickname: '',
      avatar: '',
    }
  },
  async actualSender(needleChatMessage, _, { getDb }) {
    const db = await getDb()
    if (!needleChatMessage.actualSenderId) return null
    const userId = maybeCreateFromHexString(needleChatMessage.actualSenderId)
    return await db.collection('users').findOne({ _id: userId })
  },
  async needleChatRoom(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    return db
      .collection('needleChatRooms')
      .findOne({ _id: needleChatMessage.chatRoomId })
  },
}
