import { size, map, isEmpty, find } from 'lodash'
import { ObjectId } from 'mongodb'

export const OutpatientPlan = {
  hospital: async ({ hospitalId }, args, { getDb }) => {
    const db = await getDb()
    return await db.collection('institutions').findOne({ _id: hospitalId })
  },
  department: async () => '内分泌',
  patients: async ({ patientIds, extraData }) => {
    if (isEmpty(patientIds)) return []
    const db = await getDb()
    let patients = await db
      .collection('wildPatients')
      .find({ _id: { $in: objIds } })
      .toArray()
    if (!isEmpty(extraData)) {
      patients = patients.map(p => {
        const outpatientExtra = find(extraData, { patientId: p._id })
        if (!outpatientExtra) return p
        return { ...p, outpatientExtra }
      })
    }
    return patients
  },
  patientsCount: async ({ patientIds }) => {
    return size(patientIds)
  },
}
