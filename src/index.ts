import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
const GraphQLDate = require('graphql-date')
import * as fs from 'fs'
const get = require('lodash.get')
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'

const app = new Koa()
const router = new Router()

const schemasText = fs.readFileSync('./schemas/schemas.gql', 'utf-8')

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
      }).toArray()
      const converted = objects.map(
        (a: any) => ({ footwearQuestions: a.footgear,
          footwearSelection: {
              flipFlops: undefinedFalse(a, 'footgear.question16.flipflops'),
              crocs: undefinedFalse(a, 'footgear.question16.hole'),
              net: undefinedFalse(a, 'footgear.question16.netsurface'),
              flats: undefinedFalse(a, 'footgear.question16.flat'),
              mocassins: undefinedFalse(a, 'footgear.question16.peas'),
              dress: undefinedFalse(a, 'footgear.question16.leather'),
              lowHeel: undefinedFalse(a, 'footgear.question16.three'),
              midHeel: undefinedFalse(a, 'footgear.question16.threetofive'),
              highHeel: undefinedFalse(a, 'footgear.question16.fivetoeight'),
              rain: undefinedFalse(a, 'footgear.question16.rain'),
              sandals: undefinedFalse(a, 'footgear.question16.sandals'),
              football: undefinedFalse(a, 'footgear.question16.football'),
              running: undefinedFalse(a, 'footgear.question16.running'),
              hiking: undefinedFalse(a, 'footgear.question16.hiking'),
            },
            skin: {

            },
            bone: {

            },
            blood: {

            },
            nerve: {
              symptomsPresent: undefinedFalse(a, 'peripheralNerve.symptom.normal'),
              pressureSenseLeft: undefinedFalse(a, 'peripheralNerve.pressureSense.left'),
              pressureSenseRight: undefinedFalse(a, 'peripheralNerve.pressureSense.right'),
              vibrationSenseLeft: undefinedFalse(a, 'peripheralNerve.vibrationSense.right'),
              vibrationSenseRight: undefinedFalse(a, 'peripheralNerve.vibrationSense.right'),
              temperatureSenseLeft: undefinedFalse(a, 'peripheralNerve.thalposis.right'),
              temperatureSenseRight: undefinedFalse(a, 'peripheralNerve.thalposis.right'),
              ankleReflexLeft: undefinedFalse(a, 'peripheralNerve.ankleJerk.right'),
              ankleReflexRight: undefinedFalse(a, 'peripheralNerve.ankleJerk.right'),
              leftArmSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.leftTop'),
              rightArmSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.rightTop'),
              leftLegSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.leftBottom'),
              rightLegSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.rightBottom'),
              hasDoneSomatesthesiaCheck: undefinedFalse(a, 'peripheralNerve.somatesthesiaCheck.checkBefore'),
              needsSomatesthesiaCheck: undefinedFalse(a, 'peripheralNerve.somatesthesiaCheck.needCheck'),
            },
          }),
        )
      return converted
    },
  },
}
// TODO: convert from old type to 3 state enum
const acupuntureSenceParser = (object: object, path: string) => {
  return 'NORMAL'
}
const undefinedFalse = (object: object, path: string) => {
  return get(object, path, false)
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
