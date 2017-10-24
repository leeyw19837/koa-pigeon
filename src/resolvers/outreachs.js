import { ObjectID } from 'mongodb'


export const Outreach ={
  patinet = async (patinet, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').find({
      _id: ObjectID.createFromHexString(patient._id)
    })
  }
}
