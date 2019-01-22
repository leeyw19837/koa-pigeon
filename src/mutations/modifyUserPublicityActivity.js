// 修改用户的活动状态

export const markReadPublicityActivity = async (_, args, context) => {
  const db = await context.getDb();
  const {patientId, activityId,} = args
  const userActivity = await db.collection('publicityActivityController').findOne({patientId,})
  let {activity} = userActivity
  activity = activity.map((item) => {
    if (item._id === activityId) {
      item.readState = true
      item.updatedAt = new Date()
    }
    return item
  })
  await db.collection('publicityActivityController').update({patientId,}, {$set: {activity}},)
  return true
}
