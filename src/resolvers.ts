import freshId from 'fresh-id'
import moment = require('moment')
import { parseLegacyFootAssessment } from './parseLegacyFootAssessment'
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
      const objects = await db.collection('footAssessment').find({
      }).limit(args.limit).toArray()
      return objects.map(
        (a: any) => (parseLegacyFootAssessment(a)),
      )
    },
    async footAssessment(_, args, { db }) {// TODO: is patient/foot assessment one-to-one
      const footAssessment = await db.collection('footAssessment').findOne({ ...args })
      return parseLegacyFootAssessment(footAssessment)
    },
    async events(_, args, { db }) {
      return await db.collection('event').find({
      }).limit(args.limit).toArray()
    },
  },
  Mutation: {
    async createFootAssessmentFromString(_, args, { db }) {
      const asJSON = JSON.parse(args.params.input)
      const assessment = {
        _id: freshId(17),
        medicalHistory: asJSON.medicalHistory,
        // TODO: convert the new style json into old and save to the database OR switch to another table OR change database?
      }
      console.log(assessment)
      return assessment
    },
    async createFootAssessment(_, args, { db }) {
      console.log(args)
      const assessment = {
        _id: freshId(17),
        medicalHistory: args.params.medicalHistory,
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
  },
}
