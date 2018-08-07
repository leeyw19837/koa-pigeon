export const achievement = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId, achievementType, queryType } = args
  const cursor = { patientId, achievementType }
  if (queryType === 'main') {
    cursor.accessedTime = { $exists: false }
  }
  const achievementInfo = await db.collection('achievement').
    findOne(cursor)
  if (queryType === 'main' && achievementInfo) {
    await db.collection('achievement').update({
      _id: achievementInfo._id
    },
      {
        ...achievementInfo,
        accessedTime: new Date(),
      })
  }
  return achievementInfo
}
