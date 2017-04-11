import { ObjectID } from 'mongodb'


export default {
  patient: (ts, _, { db }) => {
    return db.collection('users')
      .findOne({ _id: ObjectID.createFromHexString(ts.patientId) })
  },
}
