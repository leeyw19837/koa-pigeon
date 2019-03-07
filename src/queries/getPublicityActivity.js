export const getPublicityActivityController = async (_, args, context) => {
  const db = await context.getDb()
  // 找到当前用户的活动数据
  return await db
    .collection('publicityActivityController')
    .findOne({ patientId: args.patientId })
}

// 根据活动ID获取当前的活动信息
export const getOneOfPublicityActivity = async (_, args, context) => {
  const db = await context.getDb()
  return await db
    .collection('publicityActivity')
    .findOne({ _id: args.activityId })
}

export const getPublicActivities = async (_, { patientId }, { getDb }) => {
  const db = await getDb()
  const result = await db
    .collection('publicityActivity')
    .find({})
    .toArray()
  const activityIds = await db
    .collection('publicityActivityController')
    .distinct('activity._id', { patientId })
  return result.filter(
    o => !(o.scope === 'PART' && activityIds.indexOf(o._id) === -1),
  )
}
