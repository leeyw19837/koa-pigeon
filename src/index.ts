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

MongoClient.connect(process.env.MONGODB_URL)
  .then(db => {
    router.all(`/${process.env.SECRET}`, convert(graphqlHTTP({
      context: { db },
      schema,
      graphiql: true,
      formatError: error => {
        console.error(error)
        throw error
      },
    })))

    app.use(router.routes()).use(router.allowedMethods())

    console.log(`Running at ${PORT}`)
    app.listen(PORT)
  })
