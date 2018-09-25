import { ObjectID, ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { uploadBase64Img } from '../utils/ks3'
import { saveFoodComments } from './foodComments'
import freshId from 'fresh-id'
import some from 'lodash/some'
import moment from 'moment'
import { insertChat } from '../utils/insertNeedleChatMessage'

const dietMap = {
  BREAKFAST: '早餐',
  BREAKFAST_SNACK: '早餐加餐',
  LUNCH: '午餐',
  LUNCH_SNACK: '午餐加餐',
  DINNER: '晚餐',
  DINNER_SNACK: '晚餐加餐',
}

export const saveFoodContents = async (_, args, context) => {
  const db = await context.getDb()
  const {
    patientId,
    circleContent,
    circleImageBase64,
    measurementTime,
    measuredAt,
  } = args

  const imageUrls = []

  for (let i = 0; i < circleImageBase64.length; i++) {
    const imageUrlKey = `${patientId}${Date.now()}`
    const imageUrl = await uploadBase64Img(imageUrlKey, circleImageBase64[i])
    imageUrls.push(imageUrl)
  }
  const now = new Date()
  const foods = {
    _id: freshId(),
    patientId,
    circleContet: circleContent,
    circleImages: imageUrls,
    measurementTime,
    measuredAt,
    latestState: `上传了${dietMap[measurementTime]}`,
    createdAt: now,
  }
  await db.collection('foods').insertOne(foods)

  const taskId = freshId()
  const newTask = {
    _id: taskId,
    state: 'PENDING',
    createdAt: now,
    updatedAt: now,
    type: 'FOOD_CIRCLE',
    foodId: foods._id,
    desc: `${moment(now).format('MM-DD HH:mm')} ${foods.latestState}`,
    patientId: patientId,
  }
  await db.collection('interventionTask').insert(newTask)
  pubsub.publish('interventionTaskDynamics', {
    ...newTask,
    _operation: 'ADDED',
  })

  pubsub.publish('foodDynamics', {
    ...foods,
    _operation: 'ADDED',
  })

  //聊天页面插入task气泡
  const textContent = `上传了${dietMap[measurementTime]}`
  const sendArgs = {
    taskId,
    patientId,
    textContent,
    sourceType: 'FROM_SYSTEM',
    taskType: 'FOOD_CIRCLE',
  }
  await insertChat(_, sendArgs, context)
  return true
}

export const updateFoodScore = async (_, args, context) => {
  const db = await context.getDb()
  const { _id, scores, comment } = args
  if (!_id) throw new Error('must set _id for foods')
  const allScoreUnset = !some(scores, score => score > 0)
  if (allScoreUnset) throw new Error('should be scored items at least one')
  let success = true
  const foodRecord = await db.collection('foods').findOne({ _id })
  const updatedScoreFlag = foodRecord.totalScore && foodRecord.totalScore !== '0'
  const updateResult = await db.collection('foods').update(
    {
      _id,
    },
    {
      $set: {
        ...scores,
        replyStatus: 'REPLIES',
        updatedAt: new Date(),
      },
    },
  )

  success = !!updateResult.result.ok
  if (comment) {
    if (success) {
      const saveCommentResult = await saveFoodComments(null, { comment, _operationDetailType: 'SCORES_AND_COMMENTS', patientId: foodRecord.patientId }, context)
      success = !!saveCommentResult
    }
  } else {
    const badgeId = new ObjectID().toString()
    const badgeCreatedAt = new Date()
    const recordId = freshId()
    db.collection('badgeRecords').insert({
      badgeId,
      recordId,
      badgeType: 'FOOD_MOMENTS',
      badgeState: 'UNREAD',
      recordType: 'SCORES',
      mainContentId: _id,
      patientId: foodRecord.patientId,
      senderId: 'cde',
      badgeCreatedAt,
    })
    const updatedFoods = await db.collection('foods').findOne({ _id })
    pubsub.publish('foodDynamics', {
      ...updatedFoods,
      _operation: 'UPDATED',
      _operationDetailType: 'SCORES',
      _recordId: recordId,
      badgeId,
      badgeCreatedAt,
      _senderRole: 'cde'
    })
  }
  context.response.set('effect-types', 'Foods')
  return success
}
