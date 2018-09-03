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
          '前段时间，我们糖友一起配合北大医院内分泌科及体科所，与北京电视台共同摄制了几期关于科学体育运动指导的一些栏目，第一期定于9月1日18：18在北京电视台科教频道《健康北京》栏目播出，欢迎各位糖友收看！',
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
      await multiSendMiPushForAlias(
        mipushAlias,
        'TEXT',
        '',
        '',
        massTextMessages[0].text,
      )
      pubChatMessages(massTextMessages)
    }
  }
  return 'ok'
}
