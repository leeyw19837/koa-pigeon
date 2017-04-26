import { Db } from 'mongodb'
import moment = require('moment')
import freshId from 'fresh-id'

export default async (_, args, { db }: { db: Db }) => {
  let query = {}

  if (args.day) {
    const startOfDay = moment(args.day)
      .utcOffset(args.timezone)
      .startOf('day')
      .toDate()
    const endOfDay = moment(args.day)
      .utcOffset(args.timezone)
      .endOf('day')
      .toDate()

    query = {
      patientId: args.patientId,
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    }
  }

  const existingFootAssessment = await db
    .collection('footAssessment')
    .findOne(query)

  if (existingFootAssessment) {
    return {
      _id: existingFootAssessment._id,
      patientId: existingFootAssessment.patientId,
      createdAt: existingFootAssessment.createdAt.toString(),
      assessmentDetailsJson: JSON.stringify({
        medicalHistory: existingFootAssessment.medicalHistory,
        skinConditions: existingFootAssessment.skinConditions,
        boneAndJoint: existingFootAssessment.boneAndJoint,
        peripheralVessel: existingFootAssessment.peripheralVessel,
        peripheralNerve: existingFootAssessment.peripheralNerve,
        footgear: existingFootAssessment.footgear,
      }),
    }
  }

  const newFootAssessment = {
    _id: freshId(17),
    _client: 'pigeon',
    patientId: args.patientId,
    createdAt: moment(args.day)
      .utcOffset(args.timezone)
      .startOf('day')
      .toDate(),

    medicalHistory: {},
    skinConditions: {},
    boneAndJoint: {},
    peripheralVessel: {},
    peripheralNerve: {},
    footgear: {},
  }

  await db.collection('footAssessment').insert(newFootAssessment)

  return {
    _id: newFootAssessment._id,
    patientId: newFootAssessment.patientId,
    assessmentDetailsJson: JSON.stringify({
      medicalHistory: newFootAssessment.medicalHistory,
      skinConditions: newFootAssessment.skinConditions,
      boneAndJoint: newFootAssessment.boneAndJoint,
      peripheralVessel: newFootAssessment.peripheralVessel,
      peripheralNerve: newFootAssessment.peripheralNerve,
      footgear: newFootAssessment.footgear,
    }),
  }
}
