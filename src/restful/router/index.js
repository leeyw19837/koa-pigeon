const Router = require('koa-router')
const restfulRouter = new Router()
import { uploadFileByType } from '../fileUpload/index'
import { wechatPayment, payNotify } from '../../wechatPay'
import { aliPayNotify } from '../../alipay/nofity'
import { syncMessageFromOtherSide } from '../syncMessage/index'

import { sendMassText, sendCardMassText } from '../massText'

import { callAppointmentById, aiCallNotify } from '../../modules/AI/call'

restfulRouter.post('/uploadFile', async ctx => {
  const result = await uploadFileByType(ctx)
  ctx.body = result
})

restfulRouter.post('/wechat-pay', wechatPayment.middleware('pay'), payNotify)
restfulRouter.post('/alipay', aliPayNotify)

restfulRouter.post('/sendMassText', async ctx => {
  const result = await sendMassText(ctx)
  ctx.body = result
})

// restfulRouter.get('/sendCardMassText', async ctx => {   const result = await
// sendCardMassText(ctx)   ctx.body = result })

restfulRouter.post('/syncMessage', async ctx => {
  const { header, ip, body } = ctx.request
  console.log('============== syncMessage start =============from ip:' + ip)
  const { username, content, sourceType } = body || {}
  if (
    header.authorization != '4Z21FjF' ||
    !username ||
    !content ||
    !sourceType
  ) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  console.log(syncMessageFromOtherSide, '@syncMessage')
  await syncMessageFromOtherSide(ctx.request.body)
  ctx.body = 'OK'
  console.log('============== syncMessage end =============from ip:' + ip)
})

restfulRouter.post('/aiCallTest', async ctx => {
  const { appointmentId, cdeId, period } = ctx.request.body
  await callAppointmentById({ appointmentId, cdeId, period })
  ctx.body = 'OK'
})

restfulRouter.post('/ai-call-notify', async ctx => {
  console.log(ctx.request, ctx.request.body, '~~~test')
  await aiCallNotify(ctx.request.body)
  ctx.body = 'OK'
})

export default restfulRouter
