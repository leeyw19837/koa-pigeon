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
}
