import { ObjectID } from 'mongodb'

export const CaseRecord = {
  doctor: async (caseRecord, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').findOne({
      _id: caseRecord.operator._id
    })
  }
}
