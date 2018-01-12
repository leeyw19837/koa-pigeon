import { ObjectID } from 'mongodb'

export const Warning = {
  patient: async (warning, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').findOne({
      _id: ObjectID.createFromHexString(warning.patientId),
    })
  }
}
