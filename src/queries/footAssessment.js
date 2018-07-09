import { IContext } from '../types'
import moment = require('moment')
import freshId from 'fresh-id'


export const footAssessment = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

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
        referrals: existingFootAssessment.referrals || {},
      }),
    }
  }

  const newFootAssessment = {
    _id: freshId(17),
    _client: 'pigeon',
    patientId: args.patientId,
    healthCareTeamId: args.healthCareTeamId,
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
    referrals: {},
  }

  console.log('New Foot Assessment')
  console.log(newFootAssessment)

  await db.collection('footAssessment').insert(newFootAssessment)
  try {
    await db.collection('event').insert({
      type: 'CREATE_NEW_FOOT_ASSESSMENT',
      recordId: newFootAssessment._id,
      patientId: args.patientId,
      healthCareTeamId: args.healthCareTeamId,
      createdAt: new Date(args.nowString),
    })
  } catch (e) { console.log(e.message) }

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
      referrals: newFootAssessment.referrals,
    }),
  }
}
