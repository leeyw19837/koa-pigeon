import { ObjectId } from 'mongodb'
import moment from 'moment'
import get from 'lodash/get'
const dietMap = {
  BREAKFAST: {
    beforeTime: 'BEFORE_BREAKFAST',
    afterTime: 'AFTER_BREAKFAST',
  },
  LUNCH: {
    beforeTime: 'BEFORE_LUNCH',
    afterTime: 'AFTER_LUNCH',
  },
  DINNER: {
    beforeTime: 'BEFORE_DINNER',
    afterTime: 'AFTER_DINNER',
  },
}

const getCursor = (food, time) => {
  const { measuredAt, measurementTime } = food
  const start = !!measuredAt ? moment(measuredAt).startOf('days')._d : null
  const end = !!measuredAt ? moment(measuredAt).endOf('days')._d : null

  const dietType = measurementTime.split('_')[0]

  const dietTime = get(dietMap[dietType], time)

  const cursor = {
    measuredAt: {
      $exists: true,
      $gte: start,
      $lte: end,
    },
    patientId: food.patientId,
    measurementTime: dietTime,
    dataStatus: 'ACTIVE',
  }
  return cursor
}

export const Foods = {
  beforeBloodGlucose: async (food, _, { getDb }) => {
    const db = await getDb()
    const beforeCursor = getCursor(food, 'beforeTime')
    return await db
      .collection('bloodGlucoses')
      .find(beforeCursor)
      .sort({ measuredAt: -1 })
      .limit(1)
      .toArray()
  },
  afterBloodGlucose: async (food, _, { getDb }) => {
    const db = await getDb()
    const afterCursor = getCursor(food, 'afterTime')
    return await db
      .collection('bloodGlucoses')
      .find(afterCursor)
      .sort({ measuredAt: -1 })
      .limit(1)
      .toArray()
  },
  comments: async (food, _, { getDb }) => {
    const db = await getDb()
    let foodId = food._id.toString()
    return await db
      .collection('comments')
      .find({ foodCircleId: foodId })
      .sort({ createdAt: 1 })
      .toArray()
  },
  patient: async (food, _, { getDb }) => {
    if (!food.patientId) return null
    const db = await getDb()
    return await db
      .collection('users')
      .findOne({ _id: ObjectId(food.patientId) })
  },
}
