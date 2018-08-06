import freshId from 'fresh-id'

export const glycatedHemoglobinAchieve = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId } = args
  const glycatedHemoglobinInfo = await db.collection('clinicalLabResults').
    find({ patientId: patientId, 'glycatedHemoglobin': { $gte: '7.0' } })
    .sort({ createdAt: -1 })
    .limit(2)
    .toArray()
  if (glycatedHemoglobinInfo && glycatedHemoglobinInfo.length >= 2) {
    const current = glycatedHemoglobinInfo[0].glycatedHemoglobin
    const last = glycatedHemoglobinInfo[1].glycatedHemoglobin
    const temp = last - current
    if (temp >= 1) {
      const result = await db.collection('achievement').insert({
        _id: freshId(),
        patientId,
        achievementType: 'HBA1C_IMPROVEMENT',
        previousGlycatedHemoglobin: glycatedHemoglobinInfo[1],
        currentGlycatedHemoglobin: glycatedHemoglobinInfo[0],
        accessedTime: '',
        createdAt: new Date(),
      })
      return {
        'sign': !!result.result.ok
      }
    }
    return { sign: '' }
  } else {
    return { sign: '' }
  }

}
