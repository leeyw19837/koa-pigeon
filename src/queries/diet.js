import { ObjectId } from 'mongodb'
import moment from 'moment'

export const fetchDiets = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId } = args
  const diet = await db.collection('mealHistories').aggregate([
    {
      $match: { patientId },
    },
    {$group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        items: {$push: {mealTime: "$mealTime", food: "$food"}}
    }}
  ]).toArray()

  return diet
}
