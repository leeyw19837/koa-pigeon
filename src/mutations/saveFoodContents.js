import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { uploadBase64Img } from '../utils/ks3'
import { saveFoodComments } from './foodComments'
import freshId from 'fresh-id'
import some from 'lodash/some'

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

  const foods = {
    patientId,
    circleContet: circleContent,
    circleImages: imageUrls,
    measurementTime,
    measuredAt,
    latestState: `上传了${dietMap[measurementTime]}`,
    createdAt: new Date(),
  }
  await db.collection('foods').insertOne(foods)

  const newTask = {
    _id: freshId(),
    state: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    type: 'FOOD_CIRCLE',
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

  return true
}

export const updateFoodScore = async (_, args, context) => {
  const db = await context.getDb()
  const { _id, scores, comment } = args
  if (!_id) throw new Error('must set _id for foods')
  const anyScoreUnset = some(scores, score => score === 0)
  if (anyScoreUnset) throw new Error('must set all the score for foods')
  let success = true
  const updateResult = await db.collection('foods').update(
    {
      _id: ObjectId(_id),
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
  if (success && comment) {
    const saveCommentResult = await saveFoodComments(null, { comment }, context)
    success = !!saveCommentResult
  }
  context.response.set('effect-types', 'Foods')
  return success
}
