import * as Koa from 'koa'
import * as Router from 'koa-router'
import convert = require('koa-convert')
import graphqlHTTP = require('koa-graphql')
import GraphQLDate = require('graphql-date')
import * as fs from 'fs'
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

      const appointmentObjects = await db.collection('appointments').find({// all
      }).toArray()

      // console.log(appointmentObjects)
      const convertedAppointments = appointmentObjects.map(
        (a: any) => ({ date: a.appointmentTime, nickname: a.nickname }),
        )

      // console.log(convertedAppointments)
      return convertedAppointments

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
