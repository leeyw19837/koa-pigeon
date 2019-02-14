import { graphqlKoa } from 'apollo-server-koa'
import convert from 'koa-convert'
import { getSchema } from '../schema'
import { formatError } from '../utils'

let { SECRET } = process.env

export const useGraphql = (router, context) => {
  const schema = getSchema()
  router.all(
    `/${SECRET}`,
    convert(
      graphqlKoa(ctx => ({
        context: {
          ...ctx,
          ...context,
        },
        schema,
        formatError: error => formatError(error, ctx),
        tracing: true, // 中间件 QueryAnalyzer 需要依赖 tracing 的内容
      })),
    ),
  )
}
