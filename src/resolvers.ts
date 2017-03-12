import freshId from 'fresh-id'
import moment = require('moment')
import { parseLegacyFootAssessment } from './parseLegacyFootAssessment'

const parseMedication = (old) => old.map(
    (a: any) => ({ type: a.type, value: +a.value.replace('mg', ''), unit: 'mg' }),
  )

export const resolverMap = {
  Query: {
    async appointmentsByDate(_, args, { db }) {
      // QUESTION: should be UTC?
      console.log('a', args)
      const startOfDay = moment(args.date).startOf('day').toDate()
      const endOfDay = moment(args.date).endOf('day').toDate()
      console.log('s', startOfDay)
      console.log('e', endOfDay)
      const treatmentObjects = await db.collection('treatmentState').find({
        appointmentTime: {
          $gte: startOfDay,
          $lt: endOfDay,
        },

      }).toArray()
      return treatmentObjects.map(
        (a: any) => ({ date: a.appointmentTime, didFinishFootAssessment: a.footAt, ...a }),
      )
    },
    async appointments(_, args, { db }) {
      const appointmentObjects = await db.collection('appointments').find({
      }).toArray()
      return appointmentObjects.map(
        (a: any) => ({ date: a.appointmentTime, ...a }),
      )
    },
    async patients(_, args, { db }) {
      return await db.collection('users').find({
      }).toArray()
    },
    async patient(_, args, { db }) {
      return await db.collection('users').findOne({ ...args })
    },
    async footAssessments(_, args, { db }) {
      console.log(args)
      const objects = await db.collection('footAssessment').find({
        ...args,
      }).toArray()
      return objects.map(
        (a: any) => (parseLegacyFootAssessment(a)),
      )
    },
    async footAssessment(_, args, { db }) {
      const footAssessment = await db.collection('footAssessment').findOne({ ...args })
      return parseLegacyFootAssessment(footAssessment)
    },
    async events(_, args, { db }) {
      return await db.collection('event').find({
      }).limit(args.limit).toArray()
    },
    async bloodTests(_, args, { db }) {
      const objects = await db.collection('bloodglucoses').find(args.patientId && {author: args.patientId}).toArray()
      return objects.map(
        (a: any) => ({
          result: { value: +a.bgValue, unit: 'mg/dL' },
          patientId: a.author,
          timePeriod: a.dinnerSituation,
          medication: a.pillNote[0] && parseMedication(a.pillNote),
          ...a,
        }),
      )
    },
  },
  Mutation: {
    // NOTE: accepts type and string
    async createFootAssessment(_, args, { db }) {
      let fa = args.params
      if (args.stringifiedInput) fa = JSON.parse(args.stringifiedInput)
      console.log(args)
      const assessment = {
        _id: freshId(17),
        medicalHistory: fa.medicalHistory,
        // TODO: convert the new style json into old and save to the database OR switch to another table OR change database?
      }
      console.log(assessment)
      return assessment
    },
    async createEvent(_, args, { db }) {
      const event = {
        _id: freshId(17),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.params,
        // TODO: figure out what to do if anything about value
      }
      db.collection('event').insert(event)
      return event
    },
    async setFootAssessmentCompleteFlag(_, args, { db }) {
      const reply = await db.collection('treatmentState').update({ _id: args._id }, { $set: { footAt: true } })
      if (reply.result.nModified === 1) return true
      else return false
    },
  },
}
