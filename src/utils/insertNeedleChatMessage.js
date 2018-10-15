import get from 'lodash/get'
import { ObjectID } from 'mongodb'
import { sendNeedleBubbleChatMessage } from '../mutations/sendNeedleBubbleChatMessage'
import { sendNeedleFoodChatMessage } from '../mutations/sendNeedleFoodChatMessage'

export const insertChat = async (_, args, context) => {
  const { patientId, textContent, sourceType, taskId, taskType } = args
  const db = await context.getDb()
  const chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ 'participants.userId': patientId })
  const chatRoomId = get(chatRoom, '_id')

  const sendArgs = {
    userId: patientId,
    chatRoomId,
    text: textContent,
    sourceType,
    taskId,
    taskType,
    messageType: 'BUBBLE',
  }
  const updateResult = await sendNeedleBubbleChatMessage(_, sendArgs, context)
  return !!updateResult
}

export const insertFoodMessagesIntoChat = async(_, args, context) => {
  // 2018-10-11 Iterator #22 APP端记录饮食后，同步在 needChatMessages 中插入一条
  const { patientId, senderId, shouldQueryTotalScore, foodCircleId, sourceType } = args
  const db = await context.getDb()
  const chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ 'participants.userId': patientId })
  const chatRoomId = get(chatRoom, '_id')
  const foodContents = await db
    .collection('foods')
    .findOne({ _id: foodCircleId })
  if (!foodContents) {
    throw new Error('foods _id does not exist!')
  }

  const foodComments = await db
    .collection('comments')
    .find({ foodCircleId , authorId:{$ne: patientId}})
    .sort({createdAt:-1})
    .toArray()

  const foodMessage = {
    _id: new ObjectID().toString(),
    messageType: 'CARD',
    senderId,
    createdAt: new Date(),
    sourceType,
    chatRoomId,
    content: {
      title: '饮食',
      type: 'FOOD',
      body: [
        {
          "key": "foodTime",
          "value": foodContents.measuredAt
        },
        {
          "key": "foodPeriod",
          "value": foodContents.measurementTime
        },
        {
          "key": "foodImage",
          "value": foodContents.circleImages[0]
        },
        {
          "key": "totalScore",
          "value": shouldQueryTotalScore ? (foodContents.totalScore || '0') : '0'
        },
        {
          "key": "foodComment",
          "value": !foodComments ? '' : ( foodComments.length > 0 ? foodComments[0].commentContent : '' )
        },
      ],
      toUserId: patientId,
      foodCircleId,
    },
  }
  const updateResult = await sendNeedleFoodChatMessage(_, foodMessage, context)
  return !!updateResult
}
