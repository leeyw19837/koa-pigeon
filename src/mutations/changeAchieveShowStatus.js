export const changeAchieveShowStatus = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId } = args
  return db.collection('achievementRecords').update(
    {
      patientId,
      isShown: false,
    },
    {
      $set: {
        isShown: true,
        updatedAt: new Date(),
      },
    },
    {
      multi: true
    }
  )
}
