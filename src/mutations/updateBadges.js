export const updateFoodBadgeReadState = async (_, args, context) => {
  const db = await context.getDb()
  const { badgeId } = args
  const updateResult = await db.collection('badgeRecords').update(
    {
      badgeId,
    },
    {
      $set: {
        isRead: true,
        badgeState: 'HISTORICAL',
        badgeUpdatedAt: new Date(),
      },
    },
  )
  return updateResult
}

export const setFoodBadgeState = async (_, args, context) => {
  const db = await context.getDb()
  const { badgeIds, badgeState } = args
  let updateResult = true
  badgeIds.forEach(async i => {
    updateResult = updateResult && await db.collection('badgeRecords').update(
      {
        badgeId:i,
      },
      {
        $set: {
          badgeState: badgeState,
          badgeUpdatedAt: new Date(),
        },
      },
    )
  })
  return updateResult
}
