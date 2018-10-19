import { maybeCreateFromHexString } from '../utils'
import { isEmpty } from 'lodash'

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
    if (obj.messageType === 'BUBBLE') {
      return 'NeedleBubbleMessage'
    }
    throw new Error(`Unrecognized chat message type: ${JSON.stringify(obj)}`)
  },
}

export const sharedNeedleChatMessageResolvers = {
  async sender(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()

    const senderId = needleChatMessage.senderId
    const user = await db.collection('users').findOne({
      _id: {
        $in: [senderId, maybeCreateFromHexString(senderId)],
      },
    })
    if (user) {
      const isPro = !!user.roles
      const isWechat = !isEmpty(user.wechatInfo)
      return {
        ...user,
        avatar: user.avatar
          ? user.avatar
          : isPro
            ? 'https://prod.gtzh.51ijk.com/imgs/app/avatars/doctor.png'
            : isWechat
              ? user.wechatInfo.headimgurl
                ? user.wechatInfo.headimgurl.replace('http://', 'https://')
                : user.gender === 'male'
                  ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
                  : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png'
              : user.gender === 'male'
                ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
                : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png',
      }
    }
    return { _id: '', nickname: '', avatar: '' }
  },
  async actualSender(needleChatMessage, _, { getDb }) {
    const db = await getDb()
    if (!needleChatMessage.actualSenderId) return null
    const userId = maybeCreateFromHexString(needleChatMessage.actualSenderId)
    return await db.collection('users').findOne({
      _id: {
        $in: [userId, needleChatMessage.actualSenderId],
      },
    })
  },
  async needleChatRoom(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    return db
      .collection('needleChatRooms')
      .findOne({ _id: needleChatMessage.chatRoomId })
  },
}

export const sharedCouldWithdrawMessageResolvers = {
  async withdrawUser(needleChatMessage, _, { getDb }) {
    const db = await getDb()
    if (!needleChatMessage.withdrawUserId) return null
    const userId = maybeCreateFromHexString(needleChatMessage.withdrawUserId)
    return await db.collection('users').findOne({
      _id: {
        $in: [userId, needleChatMessage.withdrawUserId],
      },
    })
  },
}
