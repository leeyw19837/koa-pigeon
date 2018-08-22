export const getInterventionTasks = async (
  _,
  { cdeId, patientId, nosy },
  { getDb },
) => {
  const db = await getDb()
  let condition = { state: { $nin: ['DONE', 'DONE_WITH_NO_SOAP'] } }
  if (!patientId && !nosy && cdeId) {
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
    condition = { patientId }
  } else if (nosy) {
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

export const getGroupedInterventionTasks = async (
  _,
  { cdeId, nosy },
  { getDb },
) => {
  const db = await getDb()
  const condition = { state: { $nin: ['DONE', 'DONE_WITH_NO_SOAP'] } }
  if (!nosy && cdeId) {
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
  } else if (nosy) {
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
  } else {
    return null
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
