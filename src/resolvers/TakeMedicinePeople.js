import { ObjectID } from 'mongodb'

export const TakeMedicinePeople = {
  async nickname(args, _, { getDb }) {
    const db = await getDb()
    const user = await db
      .collection('users')
      .findOne({ _id: ObjectID.createFromHexString(args.patientId) })
    return user.nickname
  },
}
