import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList
} from 'graphql'
const GraphQLDate = require('graphql-date')
import { MongoClient } from 'mongodb'
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'


const app = new Koa()
const router = new Router()

const schemasText = fs.readFileSync('./schemas/schemas.gql', 'utf-8')

const resolverMap = {
  Query: {
    async appointments(_: any, args: any, { db }: any) {
      const startDate = args.startDateInSeconds
      const endDate = args.endDateInSeconds

      const appointmentObjects = await db.collection('appointments').find({
        // appointmentTime: {
        //   $gte: startDate,
        //   $lt: endDate,
        // }
      }).toArray()

      // console.log(appointmentObjects)
      const convertedAppointments = appointmentObjects.map((a: any) => ({ date: a.appointmentTime, nickname: a.nickname }))

      // console.log(convertedAppointments)
      return convertedAppointments

    }
  }
}

// const AppointmentType = new GraphQLObjectType({
//   name: 'Appointment',
//   fields: {
//     date: { type: GraphQLDate }
//   }
// })

// const queryType = new GraphQLObjectType({
//   name: 'RootQuery',
//   fields: {
//     appointments: {
//       type: new GraphQLList(AppointmentType),
//       description: 'All appointments on a given date',
//       args: {
//         startDateInSeconds: {
//           type: GraphQLDate,
//           description: 'The inclusive lower bound for the appointment date.',
//           // defaultValue: 0,
//         },
//         endDateInSeconds: {
//           type: GraphQLDate,
//           description: 'The exclusive upper bound for the appointment date.',
//           // defaultValue: new Date('1/1/2039').getTime(),
//         },
//       },
//       resolve: async (_, args, { db }) => {
//         const startDate = args.startDateInSeconds
//         const endDate = args.endDateInSeconds

//         const appointmentObjects = await db.collection('appointments').find({
//           appointmentTime: {
//             $gte: startDate,
//             $lt: endDate,
//           }
//         }).toArray()

//         // console.log(appointmentObjects)
//         const convertedAppointments = appointmentObjects.map((a: any) => ({ date: a.appointmentTime, nickname: a.nickname }))

//         // console.log(convertedAppointments)
//         return convertedAppointments

//         // return appointments
//       }
//     }
//   }
// })

// const schema = new GraphQLSchema({
//   query: queryType,
// })

const schema = makeExecutableSchema({
  typeDefs: schemasText,
  resolvers: resolverMap,
})

MongoClient.connect('mongodb://paperKingDevelopingByiHealth:d3Wrg40dE@120.131.8.26:27017/paper-king-developing').then(db => {
  console.log('Connected')

  router.all('/graphql', convert(graphqlHTTP({
    schema,
    graphiql: true,
    context: { db },
  })))

  app.use(router.routes()).use(router.allowedMethods());

  app.listen(3080)
})
