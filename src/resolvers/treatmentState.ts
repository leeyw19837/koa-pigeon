import { ObjectID } from 'mongodb'

import { IContext } from '../types'


export const TreatmentState = {
  patient: async (ts, _, { getDb }: IContext) => {
    const db = await getDb()

    const user = await db.collection('users')
      .findOne({ _id: ObjectID.createFromHexString(ts.patientId) })

    if (!user || !ts.patientId) {
      console.log(`Can't find user for treatmentState ${ts._id}`)
    }
    return user
  },
}
