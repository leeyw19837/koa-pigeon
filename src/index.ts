import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
const cors = require('koa-cors')
const logger = require('koa-logger')

import getDbConstructor from './getDbConstructor'
import * as Mutation from './mutations'
import * as Query from './queries'
import * as resolvers from './resolvers'
import { IContext } from './types'
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

const PORT = process.env.PORT || 3080

const app = new Koa()
const opts = {
    name: 'yet-another-koa-app', // log name
    logRequest: false, // log request
    logResponse: true, // log response
    logError: true, // log error
    serializers: {}, // bunyan serializers, { logId, req, res, ctx, err, start, responseTime, contentLength }
    bunyanArgs: {}, // other bunyan arguments
}
app.use(logger(opts))
app.use(convert(cors()))

const router = new Router()

const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGO_URL
const SECRET = process.env.SECRET

if (MONGODB_URL === undefined) {
  console.error('Run with `yarn docker:dev`!')
  process.exit(-1)
}

const getDb = getDbConstructor(MONGODB_URL)
const context: IContext = {
  getDb,
}

router.get('/', ctx => {
  ctx.body = 'OK'
})
router.get('/healthcheck', ctx => {
  ctx.body = 'OK'
})

router.all(`/${SECRET}`, convert(graphqlHTTP({
  context,
  schema,
  graphiql: true,
  formatError,
})))

app
  .use(router.routes())
  .use(router.allowedMethods())

console.log(`Running at ${PORT}`)
app.listen(PORT)
