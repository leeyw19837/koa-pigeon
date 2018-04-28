import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
const cors = require('koa-cors')
const bodyParser = require('koa-bodyparser')
import * as morgan from 'koa-morgan'
import constructGetDb from 'mongodb-auto-reconnect'
import { createServer } from 'http'
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import Mutation from './mutations'
import Query from './queries'
import * as resolvers from './resolvers'
import * as Subscription from './subscriptions'
import { IContext } from './types'
import { Date, formatError } from './utils'
import cronJobRouter from './cronJob/router'
import shortMessageRouter from './shortMessage/router'
import miniProgramRouter from './miniProgram/router'

const { NODE_ENV, PORT, MONGO_URL, SECRET, JWT_SECRET } = process.env

// This is necessary because graphql-tools
// looks for __esModule in the schema otherwise
delete (resolvers as any).__esModule

;(async () => {
const resolverMap = {
  ...resolvers,
  Subscription,
  Query,
  Mutation,
  Date,
} as any // TODO(jan): Find a way to make this typed

const schemasText = fs
  .readdirSync('./schemas/')
  .map(fileName => fs.readFileSync(`./schemas/${fileName}`, 'utf-8'))

const schema = makeExecutableSchema({
  resolvers: resolverMap,
  typeDefs: schemasText,
})

const app = new Koa()
// if (NODE_ENV === 'production') {
//   app.use(morgan('combined'))
// } else {
//   app.use(morgan('dev'))
// }
app.use(convert(cors()))
app.use(bodyParser())

if (MONGO_URL === undefined) {
  console.error('Run with `yarn docker:dev`!')
  process.exit(-1)
}

const getDb = constructGetDb(MONGO_URL || '')
const context: IContext = {
  getDb,
}

;(global as any).db = await getDb()

const router = new Router()

router.get('/healthcheck', ctx => {
  ctx.body = 'OK'
})

router.post('/log', ctx => {
  console.log(ctx.request.body)
})

router.use('/cron-job', cronJobRouter.routes())
router.use('/short-message', shortMessageRouter.routes())
router.use('/wx-mini', miniProgramRouter.routes())

router.all(
  `/${SECRET}`,
  convert(
    graphqlHTTP({
      context,
      schema,
      graphiql: true,
      formatError,
    }),
  ),
)

app.use(router.routes()).use(router.allowedMethods())

const ws = createServer(app.callback())
  ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://localhost:${PORT}`)
    // Set up the WebSocket for handling GraphQL subscriptions
    new SubscriptionServer(
      {
        execute,
        subscribe,
        schema: schema as any,
      },
      {
        server: ws,
        path: '/feedback',
      },
    )
  })
console.log(`Running at ${PORT}/${SECRET}; Node env: ${NODE_ENV}`)
// app.listen(PORT)
})()
