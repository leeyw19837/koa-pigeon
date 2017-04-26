import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'

import Mutation from './mutations'
import Query from './queries'
import resolvers from './resolvers'
import formatError from './utils/formatError'


const resolverMap = {
  ...resolvers,
  Query,
  Mutation,
}

const schemasText = fs
  .readdirSync('./schemas/')
  .map(fileName =>
    fs.readFileSync(`./schemas/${fileName}`, 'utf-8'),
)

const schema = makeExecutableSchema({
  resolvers: resolverMap,
  typeDefs: schemasText,
})

const PORT = 3080

const app = new Koa()
const router = new Router()

const MONGODB_URL = process.env.MONGODB_URL
const SECRET = process.env.SECRET

MongoClient.connect(MONGODB_URL).then(db => {
  router.all(`/${SECRET}`, convert(graphqlHTTP({
    context: { db },
    schema,
    graphiql: true,
    formatError,
  })))

  app
    .use(router.routes())
    .use(router.allowedMethods())

  console.log(`Running at ${PORT}`)
  app.listen(PORT)
}).catch(error => console.error(`Error: ${JSON.stringify(error.message)}`))
