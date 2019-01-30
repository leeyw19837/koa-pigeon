import { maybeCreateFromHexString } from '../utils'
import { isEmpty } from 'lodash'

const specialSenderMap = new Map([
  [
    'FROM_FOREST',
    {
      nickname: '照护森林',
      avatar:
        'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1541669820407.png',
    },
  ],
  [
    'FROM_RAVEN',
    {
      nickname: '短信系统',
      avatar:
        'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1541670208966.png',
    },
  ],
  [
    'FROM_SYSTEM',
    {
      nickname: '系统',
      avatar:
        'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1548840912578.jpeg',
    },
  ],
])

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
    let actualSenderId = needleChatMessage.actualSenderId
    if (!actualSenderId) actualSenderId = needleChatMessage.senderId
    if (
      actualSenderId === 'system' &&
      specialSenderMap.has(needleChatMessage.sourceType)
    ) {
      const specialSender = specialSenderMap.get(needleChatMessage.sourceType)
      return { _id: 'system', ...specialSender }
    }
    const userId = maybeCreateFromHexString(actualSenderId)
    return await db.collection('users').findOne({
      _id: {
        $in: [userId, actualSenderId],
      },
    })
  },
  async needleChatRoom(needleChatMessage, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    return db
      .collection('needleChatRooms')
      .findOne({ _id: needleChatMessage.chatRoomId })
  },
  async editor(needleChatMessage, _, { getDb }) {
    const db = await getDb()
    if (!needleChatMessage.editorId) return null
    const userId = maybeCreateFromHexString(needleChatMessage.editorId)
    return await db.collection('users').findOne({
      _id: {
        $in: [userId, needleChatMessage.editorId],
      },
    })
  },
}
