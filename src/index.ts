import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
const GraphQLDate = require('graphql-date')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'
import { resolverMap } from './resolvers'
const app = new Koa()
const router = new Router()
// import schemasText from './schemas/footAssessment.gql'
const schemasText = fs.readFileSync('./schemas/footAssessment.gql', 'utf-8')

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
