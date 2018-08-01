import { ObjectID } from 'mongodb'

export const InterventionTask = {
  patient: async (task, _, { getDb }) => {
    const db = await getDb()
    return await db.collection('users').findOne({
      _id: ObjectID(task.patientId),
    })
  },
  foods: async (task, _, { getDb }) => {
    const db = await getDb()
    return await db.collection('foods').findOne({
      _id: task.foodId,
    })
  },
}
