import Router from 'koa-router'
import { queryAnalyzer } from '../middlewares'
import { useRestful } from './restful'
import { useGraphql } from './graphql'
const router = new Router()

export const useRouter = async context => {
  // 添加restful 接口
  useRestful(router)

  router.use(
    queryAnalyzer({
      appendTo: 'BODY',
      ignores: ['ID', 'String', 'Date', 'Int', 'Boolean', 'Float'],
    }),
  ) // 需要打开 graphql 服务的 tracing

  // 添加 graphql 的 router
  useGraphql(router, context)

  App.use(router.routes()).use(router.allowedMethods())
}
