import miniProgramRouter from '../miniProgram/router'
import redisCron from '../redisCron/router'
import shortMessageRouter from '../shortMessage/router'
import LoginController from '../login/login.controller'
import cronJobRouter from '../cronJob/router'
import restfulApi from '../restful/router'

export const useRestful = router => {
  router
    .get('/healthcheck', ctx => {
      ctx.body = 'OK'
    })
    .use('/cron-job', cronJobRouter.routes())
    .use('/short-message', shortMessageRouter.routes())
    .use('/wx-mini', miniProgramRouter.routes())
    .use('/redis-cron', redisCron.routes())
    .use('/api', restfulApi.routes())
    .post('/login', LoginController.login)
    .post('/register', LoginController.register)
}
