import { parse, stringify } from 'date-aware-json'
import freshId from 'fresh-id'
import { ObjectID } from 'mongodb'
import { uploadBase64Img } from './ks3'
import moment = require('moment')
import { log } from './logging'


export default {
  // NOTE: accepts type and string
  // async createFootAssessment(_, args, { db }) {
  //   let fa = args.params
  //   if (args.stringifiedInput) fa = JSON.parse(args.stringifiedInput)
  //   console.log(args)
  //   const assessment = {
  //     _id: freshId(17),
  //     medicalHistory: fa.medicalHistory,
  //     // TODO: convert the new style
  // json into old and save to the database OR switch to another table OR change database?
  //   }
  //   console.log(assessment)
  //   return assessment
  // },
  createEvent: log('Mutation.createEvent', async (_, args, { db }) => {
    const event = {
      _id: freshId(17),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...JSON.parse(args.payload),
    }
    const { result } = await db.collection('event').insert(event)
    return result.nInserted === 1
  }),
  savePhoto: log('Mutation.savePhoto', async (_, args, { db }) => {
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
  }),
  createFootAssessment: log('Mutation.createFootAssessment', async (_, args, { db }) => {
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
  }),
  setAssessmentState: log('Mutation.setAssessmentState', async (_, args, { db }) => {
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
  }),
  signInPatient: log('Mutation.signInPatient', async (_, args, { db }) => {
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

      const appointmentModifyRes = await db.collection('appointments').update({
        patientId,
        appointmentTime: { $gte: StartOfDay, $lt: EndOfDay },
      }, {
        $set: {
          isOutPatient: true,
        },
      })

      const setIsDonee = await db.collection('users').update({
        _id: new ObjectID(patientId),
      }, {
        $set: {
          isDonee: true,
        },
      })

      return {
        eventRes: modifyResult.ops[0],
        checkInRes: treatmentStateModifyRes.result.ok && appointmentModifyRes.result.ok,
        setIsDonee: setIsDonee.result.ok,
      }
    } else return
  }),
  signOutPatient: log('Mutation.signOutPatient', async (_, args, { db }) => {
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
  }),

}
