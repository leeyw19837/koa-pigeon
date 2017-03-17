import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'
import { resolverMap } from './resolvers'

const app = new Koa()
const router = new Router()
let schemasText = fs.readdirSync('./schemas/').map((fileName) => fs.readFileSync(`./schemas/${fileName}`, 'utf-8'))

const schema = makeExecutableSchema({
  resolvers: resolverMap,
  typeDefs: schemasText,
})

const SECRET = '8B8kMWAunyMhxM9q9OhMVCJiXpxBIqpo'

MongoClient.connect('mongodb://paperKingDevelopingByiHealth:d3Wrg40dE@120.131.8.26:27017/paper-king-developing')
  .then((db) => {
    console.log('Running...')

    router.all(`/${SECRET}`, convert(graphqlHTTP({
      context: { db },
      schema,
      graphiql: true,
    })))

    app.use(router.routes()).use(router.allowedMethods())

    app.listen(3080)
  })
