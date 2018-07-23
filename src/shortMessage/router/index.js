import {
  orderSuccessPatients,
  stopOutpatientService,
  sportPatients,
} from '../controller'

const Router = require('koa-router')
const shortMessage = new Router()

// 北大运动会报名成功
shortMessage.get('/order-success', async ctx => {
  if (ctx.query.pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const { isSender } = ctx.query
  await orderSuccessPatients(isSender)
  ctx.body = 'OK'
})
shortMessage.get('/sport-success', async ctx => {
  const { isSender } = ctx.query
  await sportPatients(isSender)
  ctx.body = 'OK'
})

shortMessage.get('/stop-outpatient', async ctx => {
  if (ctx.query.pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const { isSender } = ctx.query
  await stopOutpatientService(isSender)
  ctx.body = 'OK'
})

export default shortMessage
