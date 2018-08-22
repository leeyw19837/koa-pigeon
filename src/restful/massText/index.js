import { ObjectID } from 'mongodb'
import find from 'lodash/find'

import { multiSendMiPushForAlias } from '../../mipush/multiMiPushForAlias'
import { pubsub } from '../../pubsub'

export const sendMassText = async ctx => {
  const { text, healthCareTeamIds } = ctx.request.body
  const hctIds = healthCareTeamIds || ['ihealthCareTeam']
  const users = await db
    .collection('users')
    .find({
      deviceContext: { $exists: 1 },
      patientState: 'ACTIVE',
      healthCareTeamId: {
        $in: hctIds,
      },
    })
    .toArray()
  const massTextMessages = []
  const patientIds = users.map(o => o._id.toString())
  const mipushAlias = []
  const chatRooms = await db
    .collection('needleChatRooms')
    .find({
      'participants.userId': { $in: patientIds },
    })
    .toArray()
  users.forEach(user => {
    const patientId = user._id.toString()
    const chatRoom = chatRooms.filter(o =>
      find(o.participants, item => item.userId === patientId),
    )[0]
    if (chatRoom) {
      mipushAlias.push(patientId)
      const message = {
        _id: new ObjectID().toString(),
        messageType: 'TEXT',
        text:
          text ||
          '李昂医生健康直播于2018年7月28日本周六10：00开播，请您关注“共同照护”公众号回复“直播”两个字，查看详细信息并识别图中二维码，进入直播间，感谢您的配合！',
        senderId: '66728d10dc75bc6a43052036',
        chatRoomId: chatRoom._id,
        sourceType: 'SYSTEM',
        createdAt: new Date(),
      }
      massTextMessages.push(message)
    }
  })
  const pubChatMessages = cardMessages => {
    cardMessages.forEach(cardMsg => {
      pubsub.publish('chatMessageAdded', { chatMessageAdded: cardMsg })
    })
  }
  if (massTextMessages.length) {
    const insertResult = await db
      .collection('needleChatMessages')
      .insert(massTextMessages)
    if (insertResult.result.ok === 1) {
      // await multiSendMiPushForAlias(mipushAlias, 'TEXT')
      pubChatMessages(massTextMessages)
    }
  }
  return 'ok'
}
