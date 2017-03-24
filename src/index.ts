import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'
import { resolverMap } from './resolvers'


const PORT = 3080

const app = new Koa()
const router = new Router()
const schemasText = fs.readdirSync('./schemas/').map(fileName => fs.readFileSync(`./schemas/${fileName}`, 'utf-8'))

const schema = makeExecutableSchema({
  resolvers: resolverMap,
  typeDefs: schemasText,
})

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://paperKingDevelopingByiHealth:d3Wrg40dE@120.131.8.26:27017/paper-king-developing'
const SECRET = process.env.SECRET || 'graphql'

MongoClient.connect(MONGODB_URL)
  .then(db => {
    router.all(`/${SECRET}`, convert(graphqlHTTP({
      context: { db },
      schema,
      graphiql: true,
      formatError: error => {
        console.error(`-------- ERROR ${new Date()} --------`)
        console.error(error)
        console.error(JSON.stringify(error))
        console.error(`----------------------------------------`)
        throw error
      },
    })))

    app.use(router.routes()).use(router.allowedMethods())

    console.log(`Running at ${PORT}`)
    app.listen(PORT)
  })
