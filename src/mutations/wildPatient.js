import freshId from 'fresh-id'

export const addWildPatient = async (_, { operatorId, patient }, context) => {
  const db = await context.getDb()
  const { mobile, idCard } = patient
  const isDuplicate = await db.collection('wildPatients').count({
    mobile,
    idCard,
  })
  if (isDuplicate) throw new Error('No duplicate mobile or idCard allowed')

  const result = await db.collection('wildPatients').insert({
    _id: freshId(),
    ...patient,
    createdAt: new Date(),
    createdBy: operatorId,
  })

  return result.result.ok
}
