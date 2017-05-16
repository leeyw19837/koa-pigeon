import { Db } from 'mongodb'

export default {
  saveAssessmentTimes: async (_, args, { db }: { db: Db }) => {
    const {
      treatmentStateId,
      role,
      startAtString,
      stopAtString,
    } = args

    const treatmentState = await db.collection('treatmentState').findOne({ _id: treatmentStateId })
    if (!treatmentState) {
      return false
    }

    await db.collection('treatmentState').update({ _id: treatmentState._id }, {
      $push: {
        assessmentTimes: {
          role,
          startAt: new Date(startAtString),
          stopAt: new Date(stopAtString),
        },
      },
    })

    return true
  },
}
