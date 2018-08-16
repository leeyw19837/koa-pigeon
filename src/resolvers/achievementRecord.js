import { ObjectID } from 'mongodb'

export const AchievementRecord = {
  achievement: async (achievementRecord, _, { getDb }) => {
    const db = await getDb()
    return db.collection('achievementRecords').findOne({
      _id: achievementRecord.achievementId,
    })
  },
}
