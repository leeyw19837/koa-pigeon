import {ObjectID} from 'mongodb'
import find from 'lodash/find'

import {multiSendMiPushForAlias} from '../../mipush/multiMiPushForAlias'
import {pubsub} from '../../pubsub'

export const sendMassText = async ctx => {
  const {text, healthCareTeamIds} = ctx.request.body
  const hctIds = healthCareTeamIds || ['ihealthCareTeam']
  const users = await db
    .collection('users')
    .find({
      deviceContext: {
        $exists: 1
      },
      patientState: 'ACTIVE',
      healthCareTeamId: {
        $in: hctIds
      }
    })
    .toArray()
  const massTextMessages = []
  const patientIds = users.map(o => o._id.toString())
  const mipushAlias = []
  const chatRooms = await db
    .collection('needleChatRooms')
    .find({
      'participants.userId': {
        $in: patientIds
      }
    })
    .toArray()
  users.forEach(user => {
    const patientId = user
      ._id
      .toString()
    const chatRoom = chatRooms.filter(o => find(o.participants, item => item.userId === patientId),)[0]
    if (chatRoom) {
      mipushAlias.push(patientId)
      const message = {
        _id: new ObjectID().toString(),
        messageType: 'TEXT',
        text: text || '前段时间，我们糖友一起配合北大医院内分泌科及体科所，与北京电视台共同摄制了几期关于科学体育运动指导的一些栏目，第一期定于9月1日18：18在北京电视台科教频道《' +
            '健康北京》栏目播出，欢迎各位糖友收看！',
        senderId: '66728d10dc75bc6a43052036',
        chatRoomId: chatRoom._id,
        sourceType: 'SYSTEM',
        createdAt: new Date()
      }
      massTextMessages.push(message)
    }
  })
  const pubChatMessages = cardMessages => {
    cardMessages.forEach(cardMsg => {
      pubsub.publish('chatMessageAdded', {chatMessageAdded: cardMsg})
    })
  }
  if (massTextMessages.length) {
    const insertResult = await db
      .collection('needleChatMessages')
      .insert(massTextMessages)
    if (insertResult.result.ok === 1) {
      await multiSendMiPushForAlias(mipushAlias, 'TEXT', '', '', massTextMessages[0].text,)
      pubChatMessages(massTextMessages)
    }
  }
  return 'ok'
}

export const sendCardMassText = async ctx => {
  const {text, healthCareTeamIds} = ctx.request.body
  const users = await db
    .collection('users')
    .find({
      'deviceContext.appVersion': {
        $in: ["1.6.3.4", "1.6.3.5", "1.6.4.1", "1.6.4.3", "1.6.5.1"]
      },
      patientState: 'ACTIVE'
    })
    .toArray()

  console.log('要推送的人数-->', users.length);
  const massTextMessages = []
  const patientIds = users.map(o => o._id.toString())
  const mipushAlias = []
  const chatRooms = await db
    .collection('needleChatRooms')
    .find({
      'participants.userId': {
        $in: patientIds
      }
    })
    .toArray()
  users.forEach(user => {
    const patientId = user
      ._id
      .toString()
    const chatRoom = chatRooms.filter(o => find(o.participants, item => item.userId === patientId),)[0]
    if (chatRoom) {
      mipushAlias.push(patientId)
      const message = {
        _id: new ObjectID().toString(),
        messageType: 'CARD',
        "content": {
          "title": "如何判断运动量是否合适",
          "type": "KNOWLEDGE",
          "body": [
            {
              "key": "id",
              "value": "5bd196af9116c9a0cc4c139e"
            }, {
              "key": "title",
              "value": "如何判断运动量是否合适"
            }, {
              "key": "content",
              "value": "之前的话题里咱们讲过怎么运动能达到降糖效果，但是最近有糖友在后台向我们提问：“我应该运动多长时间才能达到降糖效果”；“运动种类那么多哪种更利于降糖”；“运动时间" +
                  "长，有时会感觉到饥饿，这种情况可以补糖吗”等等。我们将部分糖友的问题整理了出来，下面我们用简洁明了的对话形式告诉大家这些问题的答案。"
            }, {
              "key": "avatar",
              "value": "https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1540462127389.png"
            }, {
              "key": "type",
              "value": "VIDEO"
            }
          ],
          "toUserId": patientId
        },
        senderId: 'system',
        chatRoomId: chatRoom._id,
        sourceType: 'FROM_SYSTEM',
        createdAt: new Date()
      }
      massTextMessages.push(message)

    }
  })

  const pubChatMessages = cardMessages => {
    cardMessages.forEach(cardMsg => {
      pubsub.publish('chatMessageAdded', {chatMessageAdded: cardMsg})
    })
  }
  if (massTextMessages.length) {
    const insertResult = await db
      .collection('needleChatMessages')
      .insert(massTextMessages)
    if (insertResult.result.ok === 1) {
      await multiSendMiPushForAlias(mipushAlias, 'TEXT', '', '', massTextMessages[0].text,)
      pubChatMessages(massTextMessages)
    }
  }
  console.log('推送成功', massTextMessages.length)
  return 'ok'
}
