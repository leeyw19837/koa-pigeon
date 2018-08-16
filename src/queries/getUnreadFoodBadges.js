export const getUnreadFoodBadges = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId } = args
  return await db
    .collection('badgeRecords')
    .find({
      patientId,
      badgeType: 'FOOD_MOMENTS',
      senderId: {$ne: patientId},
      isRead: false,
    })
    .toArray()
}
