import { ObjectID } from 'mongodb'

export const TreatmentState = {
  patient: async (ts, _, { getDb }) => {
    const db = await getDb()

    const user = await db
      .collection('users')
      .findOne({ _id: ObjectID.createFromHexString(ts.patientId) })

    if (!user || !ts.patientId) {
      console.log(
        `------------
        Can't find user:${ts.patientId} for treatmentState ${ts._id}
        likely deleted, delete this treatment state? or maybe write code that considers this outcome holistically
        -------------`,
      )
    }
    return user
  },
}
