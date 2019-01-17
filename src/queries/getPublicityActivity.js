export const getPublicityActivityController = async (_, args, context) => {
  const db = await context.getDb();
  // 找到当前用户的活动数据
  return await db.collection('publicityActivityController').findOne({patientId: args.patientId});
}

// 根据活动ID获取当前的活动信息
export const getOneOfPublicityActivity = async (_, args, context) => {
  const db = await context.getDb();
  return await db.collection('publicityActivity').findOne({_id:args.activityId});
}

