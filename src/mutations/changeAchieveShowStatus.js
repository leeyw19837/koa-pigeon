export const changeAchieveShowStatus = async (_, args, context) => {
  const db = await context.getDb()
  const { achievementRecordId } = args
  return db.collection('achievementRecords').update(
    {
      _id: achievementRecordId
    },
    {
      $set: {
        isShown: true,
      },
    },
  )
}
