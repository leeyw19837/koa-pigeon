import * as Koa from 'koa'
import * as Router from 'koa-router'
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')
import * as fs from 'fs'
import { makeExecutableSchema } from 'graphql-tools'
const cors = require('koa-cors')
import * as morgan from 'koa-morgan'

import getDbConstructor from './getDbConstructor'
import Mutation from './mutations'
import Query from './queries'
import * as resolvers from './resolvers'
import { IContext } from './types'
import { formatError, Date } from "./utils";


const {
  NODE_ENV,
  PORT,
  MONGO_URL,
  SECRET,
} = process.env


// This is necessary because graphql-tools
// looks for __esModule in the schema otherwise
delete (resolvers as any).__esModule

const resolverMap = {
  ...resolvers,
  Query,
  Mutation,
  Date
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


const app = new Koa()
// if (NODE_ENV === 'production') {
//   app.use(morgan('combined'))
// } else {
//   app.use(morgan('dev'))
// }
app.use(convert(cors()))


if (MONGO_URL === undefined) {
  console.error('Run with `yarn docker:dev`!')
  process.exit(-1)
}

const getDb = getDbConstructor(MONGO_URL || '')
const context: IContext = {
  getDb,
}


const router = new Router()

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

console.log(`Running at ${PORT}/${SECRET}; Node env: ${NODE_ENV}`)
app.listen(PORT)
