import { IContext } from '../types'


export const footAssessments = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  const footAssessmentObjects = await db
    .collection('footAssessment')
    .find({ patientId: args.patientId })
    .sort({ createdAt: -1 })
    .toArray()

  return footAssessmentObjects
    .map(fa => ({
      _id: fa._id,
      patientId: fa.patientId,
      createdAt: fa.createdAt.toString(),
      assessmentDetailsJson: JSON.stringify({
        medicalHistory: fa.medicalHistory,
        skinConditions: fa.skinConditions,
        boneAndJoint: fa.boneAndJoint,
        peripheralVessel: fa.peripheralVessel,
        peripheralNerve: fa.peripheralNerve,
        footgear: fa.footgear,
      }),
    }))
}
