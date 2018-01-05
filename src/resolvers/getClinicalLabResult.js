import { ObjectID } from 'mongodb'

export const ClinicalLabResult = {
  patient: async (clinicalLabResult, _, { getDb }) => {
    const db = await getDb()
    return db.collection('users').findOne({
      _id: ObjectID.createFromHexString(clinicalLabResult.patientId),
    })
  }
}
