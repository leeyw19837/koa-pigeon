const Router = require('koa-router')
const restfulRouter = new Router()
import { uploadFileByType } from '../fileUpload/index'
import { wechatPayServices } from '../../wechatPay'

import { wechatPayment, payNotify } from '../../wechatPay'

restfulRouter.post('/uploadFile', async ctx => {
  const result = await uploadFileByType(ctx)
  ctx.body = result
})

restfulRouter.post('/wechat-pay', wechatPayment.middleware('pay'), payNotify)

restfulRouter.get('/wechatSandbox', async ctx => {
  const result = await wechatPayServices.createUnifiedOrder({
    data: {
      totalPrice: 2.01,
      patientId: 'test123',
    },
  })
  ctx.body = result
})

export default restfulRouter
