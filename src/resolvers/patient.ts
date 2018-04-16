import get = require('lodash/get')
import { IContext } from '../types'
import { maybeCreateFromHexString } from '../utils/maybeCreateFromHexString'

const moment = require('moment')

export const Patient = {
  footAssessmentPhotos: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db
      .collection('photos')
      .find({
        patientId: patient._id.toString(),
        owner: 'footAssessment',
      })
      .toArray()
  },
  needleChatRoom: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db.collection('needleChatRooms').findOne({
      _id: patient.needleChatRoomId,
    })
  },
  closestAppointment: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const endOfToday = moment().endOf('day')._d
    const result = await db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
        appointmentTime: {
          $gt: endOfToday,
        },
      })
      .sort({ appointmentTime: 1 })
      .toArray()
    return result[0] || null
  },
  communications: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db
      .collection('communication')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  caseRecords: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db
      .collection('caseRecord')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  soaps: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db
      .collection('soap')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  outHospitalSoaps: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db
      .collection('outHospitalSoap')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  healthCareTeam: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    if (patient.healthCareTeamId && patient.healthCareTeamId.length > 0) {
      return db
        .collection('healthCareTeams')
        .find({
          _id: patient.healthCareTeamId[0],
        })
        .toArray()
    }
    return []
  },
  appointments: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    return db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ appointmentTime: 1 })
      .toArray()
  },
  lastAppointment: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ appointmentTime: -1 })
      .toArray()
    return result[0] || null
  },
  lastCheckAppointment: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
        isOutPatient: true,
        type: { $nin: ['addition'] },
      })
      .sort({ appointmentTime: -1 })
      .toArray()
    return result[0] || null
  },
  useIGluco: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('users')
      .find({
        _id: maybeCreateFromHexString(patient._id),
      })
      .toArray()
    return !!get(result[0], 'iGlucoseUserId')
  },
  useNeedle: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('users')
      .find({
        _id: maybeCreateFromHexString(patient._id),
      })
      .toArray()
    return !!get(result[0], 'isUseNeedle')
  },
  useSPT: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('users')
      .find({
        _id: maybeCreateFromHexString(patient._id),
      })
      .toArray()
    return !!get(result[0], 'deviceSPT')
  },
  usePublicNumber: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('users')
      .find({
        _id: maybeCreateFromHexString(patient._id),
      })
      .toArray()
    return !!get(result[0], 'wechatTag')
  },
  lastHbAlc: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const result = await db
      .collection('clinicalLabResults')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ testDate: -1 })
      .toArray()
    if (result.length > 0) {
      return result[0].glycatedHemoglobin
    }
    return null
  },
  bloodGlucoses: async (patient, args, { getDb }: IContext) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const cursor = {
      patientId,
      dataStatus: 'ACTIVE',
    }
    if (args.startAt && args.endAt) {
      Object.assign(cursor, {measuredAt: { $gt: args.startAt, $lt: args.endAt }})
    }
    return await db
      .collection('bloodGlucoses')
      .find(cursor)
      .sort({ measuredAt: -1 })
      .toArray()
  }
}
