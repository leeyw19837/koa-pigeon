export const getUnreadFoodBadges = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId } = args
  return await db
    .collection('badgeRecords')
    .find({
      patientId,
      badgeType: 'FOOD_MOMENTS',
      badgeState: {$ne: 'DELETED'},
      senderId: {$ne: patientId},
    })
    .sort({badgeCreatedAt:-1})
    .toArray()
}
