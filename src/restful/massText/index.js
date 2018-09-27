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
        $in: ["1.6.3.4", "1.6.3.5", "1.6.4.1", "1.6.4.3"]
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
          "title": "无糖食品可以放心食用吗",
          "type": "KNOWLEDGE",
          "body": [
            {
              "key": "id",
              "value": "5ba370206222bd97e848a163"
            }, {
              "key": "title",
              "value": "无糖食品可以放心食用吗"
            }, {
              "key": "content",
              "value": "随着食品工业的逐渐发展，无糖食品逐渐进入大家的视野。现在市面上很多标榜着无糖的食品，我们真的可以放心食用吗？无糖食品是什么？孩子给我买的无糖食品我可以吃吗？商场" +
                  "卖的无糖可乐可以喝吗，甜蜜素是什么？下面我们来探讨下这些问题。"
            }, {
              "key": "avatar",
              "value": "http://paper-king.ks3-cn-beijing.ksyun.com/workwechat1537437051844.png"
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
