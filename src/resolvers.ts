import moment = require('moment')
import { ObjectID } from 'mongodb'
import { log } from './logging'
import Mutation from './mutations'

export const resolverMap = {
  Appointment: {
    date: app => app.appointmentTime,
    patient: (appointment, _, { db }) => {
      const patientId = appointment.patientId
      if (!patientId) {
        return null
      }
      return db
        .collection('users')
        .findOne({ _id: ObjectID.createFromHexString(patientId) })
    },
    needsFootAssessment: app => !!app.footAt,
    treatmentState: (app, _, { db }) => {
      const treatmentStateId = app.treatmentStateId
      if (!treatmentStateId) {
        return null
      }
      return db.collection('treatmentState')
        .findOne({ _id: treatmentStateId })
    },
  },
  Patient: {
    name: patient => patient.nickname,
    gender: patient => {
      switch (patient.gender) {
        case 'male': return 'MALE'
        case 'female': return 'FEMALE'
        default: return null
      }
    },
    diabetesType: patient => {
      switch (patient.diabetesType) {
        case '1': return 'ONE'
        case '2': return 'TWO'
        default: return null
      }
    },
    latestTreatmentState: (patient, _, { db }) => {
      const latestTreatmentStateId = patient.latestTSID
      if (!latestTreatmentStateId) {
        return null
      }
      return db.collection('treatmentState')
        .findOne({ _id: latestTreatmentStateId })
    },
    footAssessmentPhotos: async (patient, _, { db }) => {
      return db
        .collection('photos')
        .find({
          patientId: patient._id.toString(),
          owner: 'footAssessment',
        })
        .toArray()
    },
  },
  Photo: {
    notes: photo => photo.note,
  },
  TreatmentState: {
    patient: (ts, _, { db }) => {
      return db.collection('users')
        .findOne({ _id: ObjectID.createFromHexString(ts.patientId) })
    },
    footAssessmentState: ts => {
      switch (ts.footAt) {
        case false: return 'WAITING'
        case true: return 'COMPLETED'
        default: return 'NOT_REQUIRED'
      }
    },
    notes: ts => ts.note,

  },
  Query: {
    patient: log('Query.patient', async (_, args, { db }) => {
      return db
        .collection('users')
        .findOne({ _id: ObjectID.createFromHexString(args.id) })
    }),
    appointments: log('Query.appointments', async (_, args, { db }) => {
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
          appointmentTime: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }
      }
      const oldStyleAppointments = await db
        .collection('appointments')
        .find(query)
        .toArray()

      return oldStyleAppointments.filter(a => a.patientId)
    }),
  },
  Mutation,
}
