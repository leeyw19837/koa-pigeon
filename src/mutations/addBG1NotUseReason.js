import { ObjectID } from 'mongodb'

export const addBG1NotUseReason = async (_, args, context) => {
  const db = await context.getDb()
  const {
    patientId,
    isUseBG1,
    isGotBG1,
    reason,
    isOutpatientCompare,
    compareResult,
    bloodValue,
    BG1Value,
    isContinueUse,
    operatorId,
    operatorName,
  } = args

  const response = await db.collection('BG1NotUseReason').insertOne(
    {
      _id: new ObjectID().toString(),
      patientId,
      isUseBG1,
      isGotBG1,
      reason,
      isOutpatientCompare: isOutpatientCompare ? isOutpatientCompare : null,
      compareResult: compareResult ? compareResult : null,
      bloodValue,
      BG1Value,
      isContinueUse,
      operatorId,
      operatorName,
      operateTime: new Date(),
      createdAt: new Date(),
    },
  )
  context.response.set('effect-types', 'BG1NotUseReason')
  return response
}

