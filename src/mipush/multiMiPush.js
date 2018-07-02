import { ObjectID } from 'mongodb'
import { difference, find, omit } from 'lodash'
import {
  MI_PUSH_URL,
  ALIAS_URL,
  APP_SECRET,
  PACKAGE_NAME,
  TYPE_MAP,
} from './constants'

const querystring = require('querystring')
const request = require('request-promise')
const moment = require('moment')
const getChatRooms = async patientIds =>
  await db
    .collection('needleChatRooms')
    .find({
      'participants.userId': { $in: patientIds },
    })
    .toArray()

const getAllChatMessages = async allChatRooms =>
  await db
    .collection('needleChatMessages')
    .find({
      chatRoomId: {
        $in: allChatRooms.map(o => o._id),
      },
      createdAt: {
        $gt: moment().subtract(1, 'months')._d,
      },
    })
    .toArray()

const insertEvent = async (response, deviceType, msgCounts) => {
  await db.collection('event').insert({
    _id: new ObjectID(),
    eventType: 'treatment/sendChatCard',
    deviceType,
    pushCounts: msgCounts,
    result: JSON.parse(response),
    createdAt: new Date(),
  })
}

const getUnReadCount = (allChatMessages, chatRoom, patientId) => {
  const { participants, _id } = chatRoom
  const me = find(participants, item => item.userId === patientId) || {}
  const { lastSeenAt = new Date() } = me

  return allChatMessages.filter(
    o => o.chatRoomId === _id && moment(o.createdAt).isAfter(lastSeenAt),
  ).length
}

const generateSendMessages = async ({ type, chatCardMessages = [], messageType }) => {

  let patientIds = []

  if (messageType === 'CARD'){
    patientIds = chatCardMessages.map(o => o.content.toUserId)
  } else {
    let chatRoomIds = chatCardMessages.map(o => o.chatRoomId)

    let chatRoomInfos = await db
      .collection('needleChatRooms')
      .find({
        _id: { $in: chatRoomIds},
      })
      .toArray()

    chatRoomInfos.forEach(o=>{
      if (o.participants[0].userId !== '66728d10dc75bc6a43052036'){
        patientIds.push(o.participants[0].userId)
      }else {
        patientIds.push(o.participants[1].userId)
      }
    })
  }

  const hasDeviceContextInUser = await db
    .collection('users')
    .find({
      deviceContext: { $exists: true },
      patientState: 'ACTIVE',
      _id: { $in: patientIds.map(o => ObjectID.createFromHexString(o)) },
    })
    .toArray()

  const stringDeviceInUserIds = hasDeviceContextInUser.map(o =>
    o._id.toString(),
  )
  const needFindInBgRecordPatientIds = difference(
    patientIds,
    stringDeviceInUserIds,
  )
  const getDeviceInBgRecord = await db
    .collection('bloodGlucoses')
    .aggregate([
      {
        $match: { patientId: { $in: needFindInBgRecordPatientIds } },
      },
      {
        $sort: { measuredAt: -1 },
      },
      {
        $group: {
          _id: '$patientId',
          deviceContext: { $first: '$deviceInformation' },
        },
      },
    ])
    .toArray()

  const allDevices = [
    ...hasDeviceContextInUser,
    ...getDeviceInBgRecord.filter(o => o.deviceContext),
  ]
  const allNeedSendCardPatientIds = allDevices.map(o => o._id.toString())

  const allChatRooms = await getChatRooms(allNeedSendCardPatientIds)
  // 目前只查一个月之内的消息，来计算未读消息，多了也没有用。
  const allChatMessages = await getAllChatMessages(allChatRooms)

  const defaultOptions = {
    pass_through: 0,
    notify_type: 1,
    notify_id: TYPE_MAP[type] || 1,
    payload: JSON.stringify({ type }),
    extra: {
      notify_foreground: type === 'CHAT' ? '0' : '1',
    },
    title: '护血糖',
    description: messageType === 'CARD' ? '[新消息] 收到一张就诊提醒卡片':'[新消息] 收到一条新消息',
  }

  const sendMessages = []
  allDevices.forEach(user => {
    const { _id, deviceContext } = user
    const chatRoom = allChatRooms.filter(o =>
      find(o.participants, item => item.userId === _id),
    )
    const systemName =
      deviceContext.bundleId === 'com.ihealth.HuTang' ? 'android' : 'ios'
    const formData = {
      alias: _id,
      device: systemName,
      restricted_package_name: deviceContext.bundleId,
      ...defaultOptions,
    }
    formData.extra.badge = getUnReadCount(allChatMessages, chatRoom, _id)
    sendMessages.push(formData)
  })

  return sendMessages
}
/**
 * 小米多条推送的时候不区分平台，所以我们应该把ios和android分开两条来推
 */
const pushChatNotification = async (deviceType, chatMessages) => {
  const msgs = chatMessages.filter(o => o.device === deviceType).map(msg => {
    const { alias } = msg
    return {
      target: alias,
      message: {
        ...omit(msg, ['alias', 'device']),
      },
    }
  })
  const msgCounts = msgs.length

  if (msgCounts) {
    const stringifyMsgs = JSON.stringify(msgs)
    const encordUrl = querystring.escape(stringifyMsgs)
    const options = {
      method: 'POST',
      uri: `${MI_PUSH_URL}/v2/multi_messages/aliases?messages=${encordUrl}`,
      headers: {
        Authorization: `key=${APP_SECRET[deviceType.toLowerCase()]}`,
      },
    }
    try {
      const response = await request(options)
      await insertEvent(response, deviceType, msgCounts)
    } catch (error) {
      console.log(error, '@error')
    }
  }
}
export const multiSendMiPush = async (chatCardMessages, messageType) => {
  const chatMessages = await generateSendMessages({
    type: 'CHAT',
    chatCardMessages,
    messageType,
  })
  await pushChatNotification('ios', chatMessages)
  await pushChatNotification('android', chatMessages)
}
