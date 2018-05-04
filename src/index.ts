import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
import { graphqlKoa } from 'apollo-server-koa'
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
import { queryAnalyzer } from './middlewares'

let { NODE_ENV, PORT, MONGO_URL, SECRET } = process.env
if (!PORT) PORT = '3080'
if (!NODE_ENV) NODE_ENV = 'development'
if (!SECRET) SECRET = '8B8kMWAunyMhxM9q9OhMVCJiXpxBIqpo'
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
  } as any

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

  router.use(
    queryAnalyzer({
      appendTo: 'BODY',
      ignores: ['ID', 'String', 'Date', 'Int', 'Boolean', 'Float'],
    }),
  ) // 需要打开graphql服务的tracing
  router.all(
    `/${SECRET}`,
    graphqlKoa(ctx => ({
      context: { ...ctx, ...context },
      schema,
      formatError,
      tracing: true, // 中间件QueryAnalyzer需要依赖tracing的内容
    })),
  )

  app.use(router.routes()).use(router.allowedMethods())

  const ws = createServer(app.callback())
  ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://localhost:${PORT}`)
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
})()
