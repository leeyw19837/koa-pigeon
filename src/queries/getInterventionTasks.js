export const getInterventionTasks = async (
  _,
  { cdeId, patientId },
  { getDb },
) => {
  const db = await getDb()
  const condition = {}
  if (!patientId && cdeId) {
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
    condition.patientId = { $in: patientsIds }
  } else if (patientId) {
    condition.patientId = patientId
  } else {
    const patients = await db
      .collection('users')
      .find(
        {
          patientState: { $in: ['ACTIVE'] },
        },
        { _id: 1 },
      )
      .toArray()
    const patientsIds = patients.map(p => p._id.toString())
    condition.patientId = { $in: patientsIds }
  }
  const result = await db
    .collection('interventionTask')
    .find(condition)
    .sort({ createdAt: -1 })
    .toArray()
  return result
}

export const getGroupedInterventionTasks = async (_, { cdeId }, { getDb }) => {
  const db = await getDb()
  const condition = { state: { $nin: ['DONE', 'DONE_WITH_NO_SOAP'] } }
  if (cdeId) {
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
    condition.patientId = { $in: patientsIds }
  } else {
    const patients = await db
      .collection('users')
      .find(
        {
          patientState: { $in: ['ACTIVE'] },
        },
        { _id: 1 },
      )
      .toArray()
    const patientsIds = patients.map(p => p._id.toString())
    condition.patientId = { $in: patientsIds }
  }
  const result = await db
    .collection('interventionTask')
    .aggregate([
      { $match: condition },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', _id: 0, count: 1 } },
    ])
    .toArray()

  return result
}
