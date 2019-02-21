import { size, map, isEmpty } from 'lodash'
import { ObjectId } from 'mongodb'

export const Outpatient = {
  hospital: async ({ hospitalId }, args, { getDb }) => {
    const db = await getDb()
    return await db.collection('institutions').findOne({ _id: hospitalId })
  },
  department: async () => '内分泌',
  patients: async ({ patientIds }) => {
    if (isEmpty(patientIds)) return []
    const db = await getDb()
    const objIds = map(patientIds, id => ObjectId.createFromHexString(id))
    return db
      .collection('users')
      .find({ _id: { $in: objIds } })
      .toArray()
  },
  patientsCount: async ({ patientIds }) => size(patientIds),
}
