import moment from 'moment'

export const getFoodRecords = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId } = args
  const cursor = { patientId }
  let foods = await db
    .collection('foods')
    .find(cursor)
    .sort({ createdAt: -1 })
    .toArray()

  for (var i = 0; i < foods.length; i++) {
    var food = foods[i]
    let foodId = food._id.toString()
    let measuredDate = food.measuredAt
    let measurementTime = food.measurementTime
    let start
    let end
    if (measuredDate && measuredDate != null) {
      start = moment(measuredDate).startOf('days')._d
      end = moment(measuredDate).endOf('days')._d
    }
    let beforeTime
    let afterTime
    if (measurementTime === 'BREAKFAST' || measurementTime === 'BREAKFAST_SNACK') {
      beforeTime = 'BEFORE_BREAKFAST'
      afterTime = 'AFTER_BREAKFAST'
    } else if (measurementTime === 'LUNCH' || measurementTime === 'LUNCH_SNACK') {
      beforeTime = 'BEFORE_LUNCH'
      afterTime = 'AFTER_LUNCH'
    } else {
      beforeTime = 'BEFORE_DINNER'
      afterTime = 'AFTER_DINNER'
    }
    const beforeCursor = {
      measuredAt: {
        $exists: true,
        $gte: start,
        $lte: end,
      },
      patientId: food.patientId,
      measurementTime: beforeTime
    }
    const afterCursor = {
      measuredAt: {
        $exists: true,
        $gte: start,
        $lte: end,
      },
      patientId: food.patientId,
      measurementTime: afterTime
    }
    const beforeBloodGlucose = await db
      .collection('bloodGlucoses')
      .find(beforeCursor)
      .sort({ measuredAt: -1 })
      .limit(1)
      .toArray()
    const afterBloodGlucose = await db
      .collection('bloodGlucoses')
      .find(afterCursor)
      .sort({ measuredAt: -1 })
      .limit(1)
      .toArray()

    const comments = await db
      .collection('comments')
      .find({ foodCircleId: foodId })
      .sort({ createdAt: 1 })
      .toArray()
    food.beforeBloodGlucose = beforeBloodGlucose
    food.afterBloodGlucose = afterBloodGlucose
    food.comments = comments
  }
  return foods
}
