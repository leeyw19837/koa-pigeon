import {
  orderSuccessPatients,
  stopOutpatientService,
  sportPatients,
  sendFoodPairMeasure,
} from '../controller'

import {
  authorization
} from '../../utils/authorization'

const Router = require('koa-router')
const shortMessage = new Router()

// 北大运动会报名成功
shortMessage.get('/order-success', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const {
    isSender
  } = ctx.query
  await orderSuccessPatients(isSender)
  ctx.body = 'OK'
})
shortMessage.get('/sport-success', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const {
    isSender
  } = ctx.query
  await sportPatients(isSender)
  ctx.body = 'OK'
})

shortMessage.get('/stop-outpatient', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const {
    isSender
  } = ctx.query
  await stopOutpatientService(isSender)
  ctx.body = 'OK'
})

shortMessage.post('/food-pair-measure', async ctx => {
  const {
    header
  } = ctx.request
  if (header.authorization != '4Z21FjF') {
    return ctx.throw(401, '密码错误')
  }
  await sendFoodPairMeasure(true)
  ctx.body = 'OK'
})

export default shortMessage