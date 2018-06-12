import { ObjectID } from 'mongodb'

export const CertifiedDiabetesEducator = {
  assistant: async (cde, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').findOne({
      _id: cde.userId,
    })
  },
  patients: async (cde, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('users')
      .find({
        cdeId: cde._id,
      })
      .toArray()
  },
}
