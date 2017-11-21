import { ObjectID } from 'mongodb'

export const SOAP = {
  doctor: async (soap, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').findOne({
      _id: soap.operator._id
    })
  }
}
