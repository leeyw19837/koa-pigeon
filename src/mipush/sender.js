import {get} from 'lodash'
import {ObjectId} from 'mongodb'
import {ALIAS_URL, APP_SECRET, PACKAGE_NAME, TYPE_MAP} from './constants'

const request = require('request-promise')

export const sender = async({
  type = 'CHAT',
  pushId,
  description,
  db,
  title = '护血糖'
}) => {
  const userDeviceContextFromUserCollection = await db
    .collection('users')
    .find({
      _id: ObjectId.createFromHexString(pushId)
    })
    .sort({updatedAt: -1})
    .limit(1)
    .toArray()

  const dataFromUserCollection = userDeviceContextFromUserCollection[0]

  if (dataFromUserCollection && dataFromUserCollection.deviceContext.systemName) {
    const systemName = get(dataFromUserCollection, 'deviceContext.systemName', 'android',).toLowerCase()
    await realSender({
      type,
      pushId,
      description,
      db,
      title,
      systemName
    })
  } else {
    const userDeviceContextFromBGCollection = await db
      .collection('bloodGlucoses')
      .find({patientId: pushId})
      .sort({updatedAt: -1})
      .limit(1)
      .toArray()

    const dataFromBGCollection = userDeviceContextFromBGCollection[0]

    console.log('MIPush 异常：未在 users 表中查询到该 patientId 对应的设备信息，查询 bloodGlucoses 表。patientId = ', pushId,)

    if (dataFromBGCollection && dataFromBGCollection.deviceInformation.bundleId) {
      const bundleId = get(dataFromBGCollection, 'deviceInformation.bundleId', 'com.ihealth.HuTang',)
      await realSender({
        type,
        pushId,
        description,
        db,
        title,
        systemName: bundleId === 'com.ihealth.HuTang'
          ? 'android'
          : 'ios'
      })
    } else {
      console.log('MIPush 异常：同时未在 bloodGlucoses 表中查询到测量历史，无法确定设备类型，不进行消息推送。patientId = ', pushId,)
    }
  }
}

const getUnreadMessage = async(userId, db) => {
  const userObjectId = ObjectId.createFromHexString(userId)
  const user = await db
    .collection('users')
    .findOne({_id: userObjectId})

  if (user) {
    const {needleChatRoomId} = user
    const chatRoom = await db
      .collection('needleChatRooms')
      .findOne({_id: needleChatRoomId})

    if (chatRoom) {
      const {participants} = chatRoom
      const me = participants.find(item => item.userId === userId) || {}
      const {
        lastSeenAt = new Date()
      } = me

      const count = await db
        .collection('needleChatMessages')
        .count({
          chatRoomId: needleChatRoomId,
          senderId: {
            $ne: userId
          },
          createdAt: {
            $gt: lastSeenAt
          }
        })
      return count
    }
  }
  return 0
}

const realSender = async({
  type = 'CHAT',
  pushId,
  description,
  db,
  title = '护血糖',
  systemName
}) => {
  // if (process.env.NODE_ENV !== 'production') return
  const notifyForeGround = type === 'CHAT'
    ? '0'
    : '1'

  const unReadMsg = await getUnreadMessage(pushId, db)

  const formData = {
    alias: pushId,
    restricted_package_name: PACKAGE_NAME[systemName],
    payload: JSON.stringify({type}),
    pass_through: 0,
    notify_type: -1,
    notify_id: TYPE_MAP[type] || 1,
    'extra.badge': unReadMsg,
    'extra.notify_foreground': notifyForeGround,
    /*extra: {
            notify_foreground: notifyForeGround,
            badge: 3,
        },*/
    title,
    description
  }

  const options = {
    method: 'POST',
    uri: ALIAS_URL,
    headers: {
      Authorization: `key=${APP_SECRET[systemName]}`
    },
    form: formData
  }

  console.log('mipush options ===', options)

  const response = await request(options)

  console.log('mipush response ===', response)
}
