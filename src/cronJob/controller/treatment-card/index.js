import { uniqBy, find, get } from 'lodash'
import freshId from 'fresh-id'
import { healthCareTeamMap } from '../constants'
import { multiSendMiPushForAlias } from '../../../mipush/multiMiPushForAlias'
import { pubsub } from '../../../pubsub'
const moment = require('moment')

const getHealthCareTeams = async () =>
  await db
    .collection('healthCareTeams')
    .find({})
    .toArray()

const getChatRooms = async ({ patientIds = [], chatRoomIds = [] }) => {
  let cursor = {}
  if (patientIds.length) {
    cursor = {
      'participants.userId': {
        $in: patientIds,
      },
    }
  } else if (chatRoomIds.length) {
    cursor = {
      _id: {
        $in: chatRoomIds,
      },
    }
  }
  return await db
    .collection('needleChatRooms')
    .find(cursor)
    .toArray()
}

/**
 * 得到7天要来的预约
 * 或者3天要来的预约
 * @param {*} beforeDays
 */
const getAppointments = async (beforeDays = 6, isTest) => {
  const sevenDay = moment().add(beforeDays, 'days')
  const startAt = moment(sevenDay).startOf('day')._d
  const endAt = moment(sevenDay).endOf('day')._d
  const hctObj = isTest
    ? 'ihealthCareTeam'
    : {
        $exists: true,
      }
  const appointments = await db
    .collection('appointments')
    .find({
      isOutPatient: false,
      appointmentTime: {
        $gte: startAt,
        $lt: endAt,
      },
      healthCareTeamId: hctObj,
      // patientId: '581b055c5032f41013d49414',
    })
    .sort({ createdAt: -1 })
    .toArray()
  return appointments
}

const getHosiptalName = async (cacheData, healthCareTeamId) => {
  const sourceData = cacheData.length ? cacheData : await getHealthCareTeams()
  const healthCareTeam = sourceData.filter(o => o._id === healthCareTeamId)[0]
  return healthCareTeam ? healthCareTeam.institutionName : ' '
}

const checkSevenDays = async isTest => {
  const appointments = await getAppointments(6, isTest)
  const healthCareTeams = await getHealthCareTeams()

  const patientIds = uniqBy(appointments, 'patientId').map(o => o.patientId)
  const chatRooms = await getChatRooms({ patientIds })
  const needSendCardMessages = []
  const defaultMsg = {
    messageType: 'CARD',
    senderId: 'system',
    createdAt: new Date(),
    sourceType: 'FROM_SYSTEM',
  }

  for (let index = 0; index < patientIds.length; index++) {
    const patientId = patientIds[index]
    const chatRoom = chatRooms.filter(o =>
      find(o.participants, part => part.userId === patientId),
    )[0]
    const appointment = appointments.filter(o => o.patientId === patientId)[0]
    if (chatRoom && appointment) {
      const { type, healthCareTeamId, appointmentTime } = appointment
      const hospitalName = await getHosiptalName(
        healthCareTeams,
        healthCareTeamId,
      )
      const chatMessage = {
        _id: freshId(),
        ...defaultMsg,
        chatRoomId: chatRoom._id,
        content: {
          title: '门诊提醒',
          type: 'APPOINTMENT',
          status: 'INIT',
          sourceType: 'BEFORE_SEVEN_DAYS',
          body: [
            { key: 'hospitalName', value: hospitalName },
            { key: 'appointmentTime', value: appointmentTime },
            { key: 'appointmentType', value: type },
          ],
          recordId: appointment._id,
          toUserId: patientId,
        },
      }
      needSendCardMessages.push(chatMessage)
    }
  }
  return needSendCardMessages
}

/**
 * 这个是提前3天发送卡片时候，为了得到在7天的时候，是否发送过卡片，并且，卡片的状态是'自己确定'或者'CDE确认'
 */
const getSentAppointmentCard = async patientIds => {
  const beforeThreeDay = moment().subtract(3, 'days')
  const startAt = moment(beforeThreeDay).startOf('day')._d
  const endAt = moment(beforeThreeDay).endOf('day')._d
  const chatCards = await db
    .collection('needleChatMessages')
    .find({
      messageType: 'CARD',
      senderId: 'system',
      createdAt: {
        $gt: startAt,
        $lt: endAt,
      },
      'content.status': {
        $in: ['SELF_CONFIRMED', 'CDE_CONFIRMED', 'INIT'],
      },
      'content.sourceType': 'BEFORE_SEVEN_DAYS',
      'content.toUserId': { $in: patientIds },
    })
    .toArray()
  return chatCards
}

const checkThreeDays = async isTest => {
  const appointments = await getAppointments(3, isTest)
  const healthCareTeams = await getHealthCareTeams()
  const patientIds = uniqBy(appointments, 'patientId').map(o => o.patientId)
  const hasSentCards = await getSentAppointmentCard(patientIds)
  const chatRoomIds = uniqBy(hasSentCards, 'chatRoomId')
  const chatRooms = await getChatRooms({ patientIds })

  const needSendCardMessages = []
  const defaultMsg = {
    messageType: 'CARD',
    senderId: 'system',
    createdAt: new Date(),
    sourceType: 'FROM_SYSTEM',
  }
  for (let index = 0; index < patientIds.length; index++) {
    const patientId = patientIds[index]
    const chatCard = hasSentCards.filter(
      o => o.content.toUserId === patientId,
    )[0]
    const appointment = appointments.filter(o => o.patientId === patientId)[0]
    if (appointment) {
      const { type, healthCareTeamId, appointmentTime, _id } = appointment
      let tempObj = {}
      if (chatCard) {
        tempObj.chatRoomId = chatCard.chatRoomId
        tempObj.hospitalName =
          get(
            find(chatCard.content.body, o => o.key === 'hospitalName'),
            'value',
          ) || ''
        tempObj.beforeCardStatus = chatCard.content.status
      } else {
        const chatRoom = chatRooms.filter(o =>
          find(o.participants, part => part.userId === patientId),
        )[0]
        tempObj.chatRoomId = chatRoom ? chatRoom._id : ''
        tempObj.hospitalName = await getHosiptalName(
          healthCareTeams,
          healthCareTeamId,
        )
      }
      const { chatRoomId, hospitalName, beforeCardStatus } = tempObj
      if (chatRoomId) {
        const chatMessage = {
          _id: freshId(),
          ...defaultMsg,
          chatRoomId,
          content: {
            title: '门诊提醒',
            type: 'APPOINTMENT',
            status: 'INIT',
            sourceType: 'BEFORE_THREE_DAYS',
            body: [
              { key: 'hospitalName', value: hospitalName },
              { key: 'appointmentTime', value: appointmentTime },
              { key: 'appointmentType', value: type },
            ],
            recordId: _id,
            toUserId: patientId,
            beforeCardStatus: beforeCardStatus || 'NONE',
          },
        }
        needSendCardMessages.push(chatMessage)
      }
    }
  }
  return needSendCardMessages
}
/**
 * 在发送三天或者7天的卡片之前，需要检查已有7天的卡片是否过期
 */
const checkSevenDaysOverdueCard = async () => {
  const beforeThreeDay = moment().subtract(3, 'days')
  const startAt = moment(beforeThreeDay).startOf('day')._d
  const endAt = moment(beforeThreeDay).endOf('day')._d
  try {
    const result = await db.collection('needleChatMessages').update(
      {
        messageType: 'CARD',
        senderId: 'system',
        createdAt: {
          $gt: startAt,
          $lt: endAt,
        },
        'content.status': 'INIT',
        'content.sourceType': 'BEFORE_SEVEN_DAYS',
      },
      {
        $set: {
          'content.status': 'OVERDUE',
        },
      },
      {
        multi: true,
      },
    )
  } catch (error) {
    console.log(error)
  }
}
/**
 * 在开诊当天检查3天的卡片是否需要设置为过期
 * morning or afternoon
 * @param {*} period
 */
export const checkThreeDaysOverdueCard = async period => {
  const startAt = moment().startOf('day')
  const endAt = moment().endOf('day')
  const appointments = await db
    .collection('appointments')
    .find({
      appointmentTime: {
        $gte: startAt._d,
        $lt: endAt._d,
      },
      healthCareTeamId: { $exists: true },
    })
    .toArray()
  const currentDay = moment().isoWeekday()
  const appointmentIds = appointments
    .filter(o => {
      const { healthCareTeamId } = o
      return (
        healthCareTeamMap[healthCareTeamId] &&
        healthCareTeamMap[healthCareTeamId][currentDay] &&
        healthCareTeamMap[healthCareTeamId][currentDay] === period
      )
    })
    .map(o => o._id)
  try {
    await db.collection('needleChatMessages').update(
      {
        messageType: 'CARD',
        senderId: 'system',
        'content.status': 'INIT',
        'content.sourceType': 'BEFORE_THREE_DAYS',
        'content.recordId': { $in: appointmentIds },
      },
      {
        $set: {
          'content.status': 'OVERDUE',
        },
      },
      {
        multi: true,
      },
    )
  } catch (error) {
    console.log(error)
  }
}

const pubChatMessages = cardMessages => {
  cardMessages.forEach(cardMsg => {
    pubsub.publish('chatMessageAdded', { chatMessageAdded: cardMsg })
  })
}

const createChatCardMessage = async (cardMessages, isTest) => {
  console.log(
    `test model ${isTest}, need to send chat card length ${
      cardMessages.length
    }!!!`,
  )
  if (cardMessages.length) {
    const miPushAlias = []
    const insertResult = await db
      .collection('needleChatMessages')
      .insert(cardMessages)
    const chatInfoMsgs = cardMessages.map(o => {
      const chatInfo = {
        _id: freshId(),
        chatRoomId: o.chatRoomId,
        messageType: 'TEXT',
        senderId: '66728d10dc75bc6a43052036',
        createdAt: new Date(),
        text: '请您点击上面卡片👆中的按钮确认是否能准时参加门诊。',
        sourceType: 'FROM_SYSTEM',
      }
      miPushAlias.push(o.content.toUserId)
      return chatInfo
    })

    const chatInfoInsertResult = await db
      .collection('needleChatMessages')
      .insert(chatInfoMsgs)

    if (insertResult.result.ok === 1) {
      await multiSendMiPushForAlias({
        type: 'CHAT',
        patientIds: miPushAlias,
        messageType: 'CARD'
      })
      pubChatMessages(cardMessages)
    }
    if (chatInfoInsertResult.result.ok === 1) {
      pubChatMessages(chatInfoMsgs)
    }
  }
}

export const sendChatCardMessages = async isTest => {
  // 先检查7天的卡片是否有过期的
  await checkSevenDaysOverdueCard()

  // 先检查3天卡片上午诊的是否有过期的
  await checkThreeDaysOverdueCard('morning')

  // 检查七天后要来门诊的人需要发送7天卡片
  try {
    const sevenDayCards = await checkSevenDays(isTest)
    await createChatCardMessage(sevenDayCards, isTest)
  } catch (error) {
    console.log(error, '@seven days error')
  }

  // 检查三天后要来门诊的人需要发送3天卡片
  try {
    const threeDayCards = await checkThreeDays(isTest)
    await createChatCardMessage(threeDayCards, isTest)
  } catch (threeError) {
    console.log(threeError, '@threeError')
  }
}

export const checkOverdueForAfterTreatment = async () => {
  await checkThreeDaysOverdueCard('afternoon')
}
