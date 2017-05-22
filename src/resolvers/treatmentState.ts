import { ObjectID } from 'mongodb'


export const TreatmentState = {
  patient: async (ts, _, { db }) => {
    const user = await db.collection('users')
      .findOne({ _id: ObjectID.createFromHexString(ts.patientId) })

    if (!user || !ts.patientId) {
      console.log(`Can't find user for treatmentState ${ts._id}`)
    }
    return user
  },
}
