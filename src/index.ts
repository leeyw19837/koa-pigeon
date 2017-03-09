import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
const GraphQLDate = require('graphql-date')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'
import { parseLegacyFootAssessment } from './parseLegacyFootAssessment'
const app = new Koa()
const router = new Router()
// import schemasText from './schemas/footAssessment.gql'
const schemasText = fs.readFileSync('./schemas/footAssessment.gql', 'utf-8')

const resolverMap = {
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
      const patientObjects = await db.collection('users').find({
      }).toArray()
      const convertedPatients = patientObjects.map(
        (a: any) => ({ nickname: a.nickname }),
      )
      return convertedPatients
    },
    async footAssessments(_: any, args: any, { db }: any) {
      const objects = await db.collection('footAssessment').find({
      }).limit(args.limit).toArray()
      return objects.map(
        (a: any) => (parseLegacyFootAssessment(a)),
      )
    },
    async footAssessment(_: any, args: any, { db }: any) { // TODO: is patient/foot assessment one-to-one
      const footAssessment = await db.collection('footAssessment').findOne({
        _id: args.id,
      })
      return parseLegacyFootAssessment(footAssessment)
    },
  },
}

const schema = makeExecutableSchema({
  resolvers: resolverMap,
  typeDefs: schemasText,
})

MongoClient.connect('mongodb://paperKingDevelopingByiHealth:d3Wrg40dE@120.131.8.26:27017/paper-king-developing')
  .then((db) => {
    // console.log('Connected')

    router.all('/graphql', convert(graphqlHTTP({
      context: { db },
      schema,
      graphiql: true,
    })))

    app.use(router.routes()).use(router.allowedMethods())

    app.listen(3080)
  })
