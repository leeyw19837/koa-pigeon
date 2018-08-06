export const achievement = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId, achievementType } = args
  const achievementInfo = await db.collection('achievement').
    findOne({ patientId: patientId, achievementType })
  return achievementInfo
}
