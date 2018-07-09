export const getInterventionTasks = async (_, { cdeId }, { getDb }) => {
  const db = await getDb()
  const patients = await db
    .collection('users')
    .find(
      {
        cdeId,
        patientState: { $in: ['ACTIVE'] },
      },
      { _id: 1 },
    )
    .toArray()
  const patientsIds = patients.map(p => p._id.toString())
  const result = await db
    .collection('interventionTask')
    .find({ patientId: { $in: patientsIds } })
    .toArray()
  return result
}
