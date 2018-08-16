export const BadgeRecords = {
  contentDetail: async (badge, _, { getDb }) => {
    const db = await getDb()
    const foodMomentId = badge.mainContentId.toString()
    return await db
      .collection('foods')
      .find({
        _id: foodMomentId,
      })
      .limit(1)
      .toArray()
  },
}