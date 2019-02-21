import { makeExecutableSchema } from 'graphql-tools'
import fs from 'fs'
import * as resolvers from './resolvers'
import * as Subscription from './subscriptions'
import Mutation from './mutations'
import Query from './queries'
import { Date } from './utils'

export const getSchema = () => {
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
  return schema
}
