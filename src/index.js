import Koa from 'koa'
import { execute, subscribe } from 'graphql'
import { createServer } from 'http'
import { sign } from 'jsonwebtoken'

import constructGetDb from 'mongodb-auto-reconnect'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import 'pinyin4js'

import { useCors, useBodyParser, useJwt } from './middlewares'
import { useRouter } from './router'

import { correctSessions } from './modules/chat'

// 注释掉AI电话
// import { registerAiCalls } from './modules/AI/call'
import { getSchema } from './schema'

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
  const app = new Koa()
  global.App = app

  useCors()
  useBodyParser()
  useJwt()

  if (MONGO_URL === undefined) {
    console.error('Run with `yarn docker:dev`!')
    process.exit(-1)
  }

  const getDb = constructGetDb(MONGO_URL || '')
  const getRavenDb = constructGetDb(MONGO_RAVEN_URL || '')
  const context = {
    getDb,
    jwtsign: payload => {
      return sign(payload, JWT_SECRET, { expiresIn: '7 day' })
    },
  }
  global.db = await getDb()
  global.ravenDb = await getRavenDb()
  global.PigeonEmitter = PigeonEmitter

  // 注释掉AI电话
  // await registerAiCalls()

  useRouter(context)
  const schema = getSchema()
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
