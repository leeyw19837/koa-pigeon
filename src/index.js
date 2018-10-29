import Koa from 'koa'
import Router from 'koa-router'
import convert from 'koa-convert'
import { graphqlKoa } from 'apollo-server-koa'
import fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
import cors from 'koa-cors'
import bodyParser from 'koa-bodyparser'
import { execute, subscribe } from 'graphql'
import { createServer } from 'http'
import { sign } from 'jsonwebtoken'
import koajwt from 'koa-jwt'

import constructGetDb from 'mongodb-auto-reconnect'
import { SubscriptionServer } from 'subscriptions-transport-ws'

import cronJobRouter from './cronJob/router'
import { Auth, queryAnalyzer } from './middlewares'
import miniProgramRouter from './miniProgram/router'
import Mutation from './mutations'
import Query from './queries'
import redisCron from './redisCron/router'
import * as resolvers from './resolvers'
import shortMessageRouter from './shortMessage/router'
import * as Subscription from './subscriptions'

import LoginController from './login/login.controller'

import { Date, formatError } from './utils'
import restfulApi from './restful/router'
import { correctSessions } from './modules/chat'

import { registerAiCalls } from './modules/AI/call'

const EventEmitter = require('events')

const PigeonEmitter = new EventEmitter()

let {
  NODE_ENV,
  PORT,
  MONGO_URL,
  MONGO_RAVEN_URL,
  SECRET,
  JWT_SECRET,
  AUTH,
} = process.env
if (!PORT) PORT = '3080'
if (!NODE_ENV) NODE_ENV = 'development'
if (!SECRET) SECRET = '8B8kMWAunyMhxM9q9OhMVCJiXpxBIqpo'
if (!AUTH) AUTH = 'FALSE'
;(async () => {
  const resolverMap = {
    ...resolvers,
    Subscription,
    Query,
    Mutation,
    Date,
  }

  const schemasText = fs
    .readdirSync('./schemas/')
    .map(fileName => fs.readFileSync(`./schemas/${fileName}`, 'utf-8'))

  const schema = makeExecutableSchema({
    resolvers: resolverMap,
    typeDefs: schemasText,
  })

  const app = new Koa()
  // if (NODE_ENV === 'production') {   app.use(morgan('combined')) } else {
  // app.use(morgan('dev')) } app.use(async (ctx, next) => {   try {     await
  // next()   } catch (err) {     console.log('Error handler:', err.message)   }
  // })

  app.use(convert(cors()))
  app.use(
    bodyParser({
      jsonLimit: '30mb',
      enableTypes: ['json', 'form', 'text'],
      extendTypes: {
        text: ['text/xml', 'application/xml'],
      },
    }),
  )
  if (MONGO_URL === undefined) {
    console.error('Run with `yarn docker:dev`!')
    process.exit(-1)
  }

  const getDb = constructGetDb(MONGO_URL || '')
  const getRavenDb = constructGetDb(MONGO_RAVEN_URL || '')
  const context = {
    getDb,
    jwtsign: payload => {
      console.log(payload, 'payload')
      return sign(payload, JWT_SECRET, { expiresIn: '7 day' })
    },
  }
  global.db = await getDb()
  global.ravenDb = await getRavenDb()
  global.PigeonEmitter = PigeonEmitter

  await registerAiCalls()

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
  router.use('/redis-cron', redisCron.routes())
  router.use('/api', restfulApi.routes())
  router.post('/login', LoginController.login)
  router.post('/register', LoginController.register)

  router.use(
    queryAnalyzer({
      appendTo: 'BODY',
      ignores: ['ID', 'String', 'Date', 'Int', 'Boolean', 'Float'],
    }),
  ) // 需要打开graphql服务的tracing

  router.use(Auth(JWT_SECRET))

  router.all(
    `/${SECRET}`,
    convert(
      graphqlKoa(ctx => ({
        context: {
          ...ctx,
          ...context,
        },
        schema,
        formatError,
        tracing: true, // 中间件QueryAnalyzer需要依赖tracing的内容
      })),
    ),
  )

  app.use(router.routes()).use(router.allowedMethods())
  if (AUTH === 'TRUE') {
    app.use(
      koajwt({ secret: JWT_SECRET }).unless({
        path: [
          /^\/public/,
          '/healthcheck',
          '/login',
          '/register',
          /\/api*/,
          /\/wx-mini*/,
          `/${SECRET}`,
          /\/feedback*/,
        ],
      }),
    )
  }

  const ws = createServer(app.callback())
  ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://localhost:${PORT}`)
    new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
        onConnect: () => context,
      },
      {
        server: ws,
        path: '/feedback',
      },
    )
  })
  console.log(`Running at ${PORT}/${SECRET}; Node env: ${NODE_ENV}`)
  correctSessions(await getDb())
})()
