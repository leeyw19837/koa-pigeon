import freshId from 'fresh-id'
import { parseLegacyFootAssessment } from './parseLegacyFootAssessment'
export const resolverMap = {
  Query: {
    async appointments(_: any, args: any, { db }: any) {
      const startDate = args.startDateInSeconds
      const endDate = args.endDateInSeconds

      const appointmentObjects = await db.collection('appointments').find({
      }).toArray()
      const convertedAppointments = appointmentObjects.map(
        (a: any) => ({ date: a.appointmentTime, nickname: a.nickname }),
      )
      return convertedAppointments
    },
    async patients(_: any, args: any, { db }: any) {
      return await db.collection('users').find({
      }).toArray()
    },
    async patient(_: any, args: any, { db }: any) {
      return await db.collection('users').findOne({...args})
    },
    async footAssessments(_: any, args: any, { db }: any) {
      const objects = await db.collection('footAssessment').find({
      }).limit(args.limit).toArray()
      return objects.map(
        (a: any) => (parseLegacyFootAssessment(a)),
      )
    },
    async footAssessment(_: any, args: any, { db }: any) { // TODO: is patient/foot assessment one-to-one
      const footAssessment = await db.collection('footAssessment').findOne({...args})
      return parseLegacyFootAssessment(footAssessment)
    },
  },
  Mutation: {
    async footAssessment(_: any, args: any, { db }: any) {
      const assessment = {
        _id: freshId(17),
        medicalHistory: {
          historyPresent: args.params.historyPresent,
        },
      }
      console.log('t', args)
      return assessment
    },
  },
}
