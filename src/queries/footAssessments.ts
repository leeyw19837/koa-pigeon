import { Db } from 'mongodb'


export default async (_, args, { db }: { db: Db }) => {
  const footAssessments = await db
    .collection('footAssessment')
    .find({ patientId: args.patientId })
    .sort({ createdAt: -1 })
    .toArray()

  return footAssessments
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
