import { pubsub } from '../pubsub'
import { uploadBase64Img } from '../utils/ks3'

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
    createdAt: now,
    updatedAt: now,
    type: 'FOOD_CIRCLE',
    patientId: measurement.patientId,
  }
  await db.collection('interventionTask').insert(newTask)
  pubsub.publish('interventionTaskDynamics', {
    ...task,
    _operation: 'ADDED',
  })

  pubsub.publish('foodDynamics', {
    ...foods,
    _operation: 'ADDED',
  })

  return true
}
