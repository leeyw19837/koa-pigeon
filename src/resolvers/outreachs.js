import { ObjectID } from 'mongodb'

export const Outreach = {
  patient: async (outreach, _, { getDb }) => {
    const db = await getDb()
    console.log(outreach.patientId)
    return db.collection('users').findOne({
      _id: ObjectID.createFromHexString(outreach.patientId)
    })
  }
}
