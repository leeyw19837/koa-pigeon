import { size, map, isEmpty, find } from 'lodash'
import { ObjectID } from 'mongodb'

export const OutpatientPlan = {
  hospital: async ({ hospitalId }, args, { getDb }) => {
    const db = await getDb()
    return await db.collection('institutions').findOne({ _id: hospitalId })
  },
  department: async () => '内分泌',
  patients: async ({ patientIds, extraData }, args, { getDb }) => {
    if (isEmpty(patientIds)) return []
    const db = await getDb()
    const objIds = map(patientIds, id => ObjectID(id))
    let patients = await db
      .collection('users')
      .find({ _id: { $in: objIds } })
      .toArray()

    if (!isEmpty(extraData)) {
      patients = patients.map(p => {
        const outpatientExtra = find(extraData, { patientId: p._id })
        if (!outpatientExtra) return p
        return { ...p, _id: p._id.valueOf(), outpatientExtra }
      })
    }
    return patients
  },
  patientsCount: async ({ patientIds }) => {
    return size(patientIds)
  },
}
