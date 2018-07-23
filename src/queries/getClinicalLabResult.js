import { ObjectID } from 'mongodb'


export const getClinicalLabResult = async (_, args, { getDb }) => {
  const db = await getDb()
  const result = [[],[],[],[],[],[]]
  const asd = await db.collection('clinicalLabResults').aggregate([
    { $sort: { testDate: -1 }},
    { $group: { _id: '$patientId', patientId: {$first: '$patientId'}, isHandle: { $first: '$isHandle' }, glycatedHemoglobin: { $first: '$glycatedHemoglobin'}, testDate: { $first: '$testDate'} }},
    { $match: { 'glycatedHemoglobin' : { $gte: '7.0' } } },
    { $sort: { testDate: -1 }},
  ]).toArray()
  asd.forEach(item => {
    let value = 9.5
    for (let i = 5; i >= 0; i--) {
      if (item.glycatedHemoglobin >= value) {
        result[i].push(item)
        break
      }
      value = value - 0.5
    }
  })
  return result
}
