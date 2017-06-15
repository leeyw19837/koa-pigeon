import { Db } from 'mongodb'


export const saveAssessmentTime = async (_, args, { db }: { db: Db }) => {
  const {
    treatmentStateId,
    role,
    occurredAtString,
    action,
  } = args

  const treatmentState = await db.collection('treatmentState').findOne({ _id: treatmentStateId })
  if (!treatmentState) {
    return false
  }

  await db.collection('treatmentState').update({ _id: treatmentState._id }, {
    $push: {
      assessmentTimes: {
        role,
        occurredAt: new Date(occurredAtString),
        action,
      },
    },
  })

  return true
}
