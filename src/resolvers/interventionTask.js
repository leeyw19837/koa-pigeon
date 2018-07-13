import { ObjectID } from 'mongodb'

export const InterventionTask = {
  patient: async (task, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').findOne({
      _id: ObjectID(task.patientId),
    })
  },
}
