const Router = require('koa-router')
const restfulRouter = new Router()
import { uploadFileByType } from '../fileUpload/index'
import { wechatPayServices } from '../../wechatPay'

import { wechatPayment, payNotify } from '../../wechatPay'
import { aliPayNotify } from '../../alipay/nofity'

restfulRouter.post('/uploadFile', async ctx => {
  const result = await uploadFileByType(ctx)
  ctx.body = result
})

restfulRouter.post('/wechat-pay', wechatPayment.middleware('pay'), payNotify)
restfulRouter.get('/alipay', aliPayNotify)

restfulRouter.get('/wechatSandbox', async ctx => {
  const result = await wechatPayServices.createUnifiedOrder({
    data: {
      totalPrice: 2.01,
      patientId: 'test123',
    },
  })
  ctx.body = result
})
restfulRouter.get('/wechatSandbox/query', async ctx => {
  const { orderId } = ctx.query
  const result = await wechatPayServices.queryUnifiedOrder({
    orderId,
    type: 'out_trade_no',
  })
  ctx.body = result
})

export default restfulRouter
