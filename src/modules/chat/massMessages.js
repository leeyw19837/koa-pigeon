import { ObjectID } from 'mongodb'
import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'

import { multiSendMiPushForAlias } from '../../mipush/multiMiPushForAlias'
import { pubsub } from '../../pubsub'

const contentMap = {
  CARD: 'content',
  TEXT: 'text',
  IMAGE: 'imageUrl',
}

export const sendMassMessages = async ({ options = {}, messageInfo = {} }) => {
  const { patientIds = [], hctIds = [], isAll } = options
  let cursor = {}
  if (isAll) {
    cursor = {}
  } else if (patientIds.length) {
    cursor = {
      _id: { $in: patientIds.map(pid => ObjectID(pid)) },
    }
  } else if (hctIds.length) {
    cursor = {
      healthCareTeamId: { $in: hctIds },
    }
  }
  if (isEmpty(cursor) && !isAll) return 'empty'
  cursor = {
    ...cursor,
    deviceContext: { $exists: 1 },
    patientState: 'ACTIVE',
  }
  const users = await db
    .collection('users')
    .find(cursor)
    .toArray()
  console.log(users.length, messageInfo)
  const { msgType, msgContent, msgPushTitle } = messageInfo
  if (!msgType || !msgContent) return 'info not enough'

  const massMessages = []
  const userIds = users.map(o => o._id.toString())
  const mipushAlias = []
  const chatRoomsId = []
  const chatRooms = await db
    .collection('needleChatRooms')
    .find({
      'participants.userId': { $in: userIds },
    })
    .toArray()
  users.forEach(user => {
    const patientId = user._id.toString()
    const chatRoom = chatRooms.filter(o =>
      find(o.participants, item => item.userId === patientId),
    )[0]
    if (chatRoom) {
      mipushAlias.push(patientId)
      chatRoomsId.push(chatRoom._id)

      const message = {
        _id: new ObjectID().toString(),
        messageType: msgType,
        senderId: '66728d10dc75bc6a43052036',
        chatRoomId: chatRoom._id,
        sourceType: 'FROM_SYSTEM',
        actualSenderId: 'system',
        createdAt: new Date(),
      }
      message[contentMap[msgType]] =
        msgType === 'CARD' ? { ...msgContent, toUserId: patientId } : msgContent
      massMessages.push(message)
    }
  })

  const pubChatMessages = messages => {
    messages.forEach(msg => {
      pubsub.publish('chatMessageAdded', { chatMessageAdded: msg })
    })
  }

  if (massMessages.length) {
    const insertResult = await db
      .collection('needleChatMessages')
      .insert(massMessages)
    try {
      await db.collection('needleChatRooms').update(
        {
          _id: { $in: chatRoomsId },
          'participants.userId': { $in: mipushAlias },
        },
        {
          $inc: { 'participants.$.unreadCount': 1 },
        },
        {
          multi: true,
        },
      )
    } catch (error) {
      console.log(error, '@error')
    }

    if (insertResult.result.ok === 1) {
      await multiSendMiPushForAlias({
        type: 'CHAT',
        patientIds: mipushAlias,
        messageType: msgType,
        title: '',
        desc: msgPushTitle || '',
        messageText: msgType === 'CARD' ? 'card' : msgContent,
      })
      pubChatMessages(massMessages)
    }
  }
  console.log(massMessages.length, '推送成功')
  return 'ok'
}
