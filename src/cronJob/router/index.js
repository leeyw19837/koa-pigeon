import { reminder } from '../controller'

const Router = require('koa-router')
const cronJob = new Router()

cronJob.get('/text-measure-plan', async ctx => {
  if (ctx.query.pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const { weekday, patientsId } = ctx.query
  const aPatientsId = patientsId ? patientsId.split('--') : []
  const result = await reminder(weekday, aPatientsId)
  ctx.body = result
})

export default cronJob
