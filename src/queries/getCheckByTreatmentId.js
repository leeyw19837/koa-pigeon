

export const getCheckByTreatmentId = async (_, args, { getDb }) => {
  const db = await getDb()
  const { treatmentStateId } = args
  const result = await db
    .collection('appointments')
    .findOne({ treatmentStateId: { '$exists': true }, treatmentStateId })
  return result
}


