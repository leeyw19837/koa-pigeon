import freshId from 'fresh-id'
import moment = require('moment')
import { parse, stringify } from 'date-aware-json'
import { ObjectID } from 'mongodb'
import { uploadBase64Img } from './ks3'

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
    async patient(_, args, { db }) {
      return db
        .collection('users')
        .findOne({ _id: ObjectID.createFromHexString(args.id) })
    },
    async appointments(_, args, { db }) {
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
    },
  },
  Mutation: {
    async createEvent(_, args, { db }) {
      const event = {
        _id: freshId(17),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...JSON.parse(args.payload),
      }
      const { result } = await db.collection('event').insert(event)
      return result.nInserted === 1
    },
    async savePhoto(_, args, { db }) {
      const { patientId, data, context, notes } = args

      const photoUrlKey = `${patientId}${Date.now()}`
      const url = await uploadBase64Img(photoUrlKey, data)

      const oldContext = (() => {
        switch (context) {
          case 'FOOT_ASSESSMENT': return 'footAssessment'
          default: throw new TypeError(`Unknown context ${context}`)
        }
      })()
      const photo = {
        patientId,
        url,
        owner: oldContext || '',
        note: notes || '',
        createdAt: new Date(),
      }
      const { result } = await db.collection('photos').insert(photo)
      return !!result.ok
    },
    async createFootAssessment(_, args, { db }) {
      const record = parse(args.payload)
      const { _id: recordId } = record

      const result = await db
        .collection('footAssessment')
        .findOneAndUpdate(
        { _id: recordId },
        record,
        { upsert: true },
      )

      if (result.ok) {
        return {
          error: null,
          result: stringify(result.value),
        }
      }
      return {
        error: 'An error occurred',
        result: null,
      }
    },
    async setAssessmentState(_, args, { db }) {
      const { patientId, assessment, state } = args

      const oldAssesment = (() => {
        switch (assessment) {
          case 'FOOT': return 'footAt'
          case 'BLOOD_VESSEL_CLOGGINESS': return 'footBloodAt'
          default: throw new TypeError(`Unknown assessment type ${assessment}`)
        }
      })()
      const oldState = (() => {
        switch (state) {
          case 'NOT_REQUIRED': return undefined
          case 'WAITING': return false
          case 'COMPLETED': return true
          default: throw new TypeError(`Unknown assessment state ${state}`)
        }
      })()
      const patient = await db
        .collection('users')
        .findOne({ _id: ObjectID.createFromHexString(patientId) })

      const latestTreatmentStateId = patient.latestTSID
      if (!latestTreatmentStateId) {
        return {
          error: `patient.latestTSID is ${patient.latestTSID}`,
          result: null,
        }
      }
      const treatmentState = await db
        .collection('treatmentState')
        .findOne({ _id: latestTreatmentStateId })
      if (!treatmentState) {
        return {
          error: `Can't find TreatmentState with id ${latestTreatmentStateId}`,
          result: null,
        }
      }
      const { result } = await db
        .collection('treatmentState')
        .update(
        { _id: latestTreatmentStateId },
        {
          $set: {
            [oldAssesment]: oldState,
          },
        },
      )
      if (result.ok) {
        return {
          error: null,
          result: state,
        }
      }
      return {
        error: JSON.stringify(result.writeConcernError),
        result: null,
      }
    },
    async signInPatient(_, args, { db }) {
      const { patientId } = args
      const StartOfDay = moment().startOf('day').toDate()
      const EndOfDay = moment().endOf('day').toDate()
      const evtExists = await db.collection('event').findOne({
        patientId,
        createdAt: { $gte: StartOfDay, $lt: EndOfDay },
        type: 'attendence/signIn',
        isSignedOut: false,
      })
      const treatmentStateExists = await db.collection('treatmentState').findOne({
        patientId,
        appointmentTime: { $gte: StartOfDay, $lt: EndOfDay },
      })
      // console.log({StartOfDay, evtExists, treatmentStateExists})
      if (!evtExists && treatmentStateExists) {
        const modifyResult = await db.collection('event').insert({
          patientId,
          createdAt: new Date(),
          type: 'attendence/signIn',
          isSignedOut: false,
        })
        // Mark attendence on treatmentState
        const treatmentStateModifyRes = await db.collection('treatmentState').update({
          patientId,
          appointmentTime: { $gte: StartOfDay, $lt: EndOfDay },
        }, {
          $set: {
            checkIn: true,
          },
        })
        const setDoneeRes = await db.collection('users').update({
          _id: patientId,
        }, {
          $set: {
            isDonee: true,
          },
        })
        return {
          eventRes: modifyResult.ops[0],
          checkInRes: treatmentStateModifyRes.result.ok,
          setDoneeRes: setDoneeRes.result.ok,
        }
      } else return
    },
    async signOutPatient(_, args, { db }) {
      const { patientId } = args
      const modifyResult = await db.collection('event').update({
        patientId,
        type: 'attendence/signIn',
        isSignedOut: false,
      }, {
          $set: {
            signOutAt: new Date(),
            isSignedOut: true,
          },
        })
      return {isSignedOut: modifyResult.result.ok}
    },
  },
}
