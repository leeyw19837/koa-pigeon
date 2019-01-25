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

const insertEvent = async (response, deviceType, msgCounts, messageText) => {
  await db.collection('event').insert({
    _id: new ObjectID(),
    eventType: 'treatment/sendChatCard',
    deviceType,
    messageText,
    pushCounts: msgCounts,
    result: JSON.parse(response),
    createdAt: new Date(),
  })
}

const generateSendMessages = async ({
  type,
  patientIds = [],
  messageType,
  title,
  desc,
  extraInfos = {}
}) => {
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

  const commonOptions = {
    pass_through: 0,
    notify_type: 1,
    notify_id: TYPE_MAP[type] || 1,
    'extra.sound_url': 'default',
    'extra.badge': 1,
    'extra.notify_foreground': type === 'CHAT' ? '0' : '1',
    title: title ? `护血糖-${title}` : '护血糖',
    description:
      messageType === 'CARD'
        ? '[新消息] 收到一张就诊提醒卡片，请点击查看。'
        : desc || '[新消息] 收到一条新消息，请点击查看。',
  }

  const defaultOptions = {
    ...commonOptions,
    payload: JSON.stringify({ type, ...extraInfos }),
    'extra.appIntent': JSON.stringify({ type, ...extraInfos }),
  }
  console.log('JSON.stringify({ type, ...extraInfos })', JSON.stringify({ type, ...extraInfos }))

  const androidPatientIds = []
  const iosPatientIds = []
  allDevices.forEach(user => {
    const { _id, deviceContext } = user
    const patientId = _id.toString()
    if (deviceContext.bundleId === 'com.ihealth.HuTang') {
      androidPatientIds.push(patientId)
    } else {
      iosPatientIds.push(patientId)
    }
  })

  return {
    android: {
      alias: androidPatientIds.join(','),
      restricted_package_name: 'com.ihealth.HuTang',
      ...defaultOptions,
    },
    ios: {
      alias: iosPatientIds.join(','),
      restricted_package_name: 'com.ihealthlabs.HuTang',
      ...defaultOptions,
    },
  }
}
/**
 * 小米多条推送的时候不区分平台，所以我们应该把ios和android分开两条来推
 */
const pushChatNotification = async (
  deviceType,
  result,
  messageText = 'card',
) => {
  const formData = result[deviceType]
  if (formData.alias) {
    const options = {
      method: 'POST',
      uri: ALIAS_URL,
      headers: {
        Authorization: `key=${APP_SECRET[deviceType]}`,
      },
      form: formData,
    }
    try {
      const response = await request(options)
      const msgCounts = formData.alias.split(',').length
      await insertEvent(response, deviceType, msgCounts, messageText)
    } catch (error) {
      console.log(error, '@error')
    }
  }
}
export const multiSendMiPushForAlias = async ({ type, patientIds, messageType, title, desc, messageText, extraInfos}) => {
  const result = await generateSendMessages({
    type,
    patientIds,
    messageType,
    title,
    desc,
    extraInfos,
  })
  await pushChatNotification('ios', result, messageText)
  await pushChatNotification('android', result, messageText)
}
