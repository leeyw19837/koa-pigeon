export const getPublicityActivityController = async (_, args, context) => {
  const db = await context.getDb();
  // 找到当前用户的活动数据
  return await db.collection('publicityActivityController').findOne({patientId: args.patientId});
}
