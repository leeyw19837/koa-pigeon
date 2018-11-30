import {ObjectID} from 'mongodb'
import moment from "moment/moment";

export const TreatmentState = {
  patient: async (ts, _, {getDb}) => {
    const db = await getDb()

    const user = await db
      .collection('users')
      .findOne({_id: ObjectID.createFromHexString(ts.patientId)})

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

  measureCounts: async (ts, _, {getDb}) => {
    const db = await getDb()
    const bgLists = await db
      .collection('bloodGlucoses').find({
        patientId: ts.patientId,
        measuredAt: {$gte: moment().subtract(7, 'days')._d},
        dataStatus: 'ACTIVE',
      }).toArray()

    return bgLists.length

  },

}
