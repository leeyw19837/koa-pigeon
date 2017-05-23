import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import { MongoClient } from 'mongodb'
const cors = require('koa-cors')

import * as Mutation from './mutations'
import * as Query from './queries'
import * as resolvers from './resolvers'
import formatError from './utils/formatError'


// This is necessary because otherwise, graphql-tools
// looks for __esModule in the schema
delete (resolvers as any).__esModule

const resolverMap = {
  ...resolvers,
  Query,
  Mutation,
} as any // TODO(jan): Find a way to make this typed

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
app.use(convert(cors()))

const router = new Router()

const MONGODB_URL = process.env.MONGODB_URL
const SECRET = process.env.SECRET

if (MONGODB_URL === undefined) {
  console.error('Run with `yarn docker:dev`!')
  process.exit(-1)
}

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
