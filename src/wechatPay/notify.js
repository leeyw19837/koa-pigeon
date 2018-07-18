import { createPayHistory } from './payHistories'
import { findOrderById, updateOrder } from './orders'

export const payNotify = async (ctx, next) => {
  let info = ctx.request.weixin
  const { transaction_id, out_trade_no, total_fee, result_code } = info
  const order = await findOrderById({ orderId: out_trade_no })
  console.log(info, order, '@result')
  let replyResult = ''
  if (order) {
    const { orderStatus, payWay, totalPrice } = order
    if (orderStatus !== 'PAY_SUCCESS' && payWay === 'WECHAT') {
      let setOrderObj = {}
      if (total_fee * 100 !== totalPrice) {
        replyResult = '订单金额和微信商户金额不匹配'
        setOrderObj = {
          returnCode: 'PAY_FAIL',
          errCode: '订单金额和微信商户金额不匹配',
        }
      } else {
        setOrderObj = {
          returnCode: 'PAY_SUCCESS',
          transactionId: transaction_id,
        }
      }
      await updateOrder({
        orderId: out_trade_no,
        data: setOrderObj,
      })
      await createPayHistory({
        orderId: out_trade_no,
        result: info,
        type: 'pay_notification',
        status: setOrderObj.returnCode,
      })
    }
  } else {
    replyResult = 'out_trade_no 在系统中不存在'
  }
  console.log(replyResult, '~~~')
  ctx.reply(replyResult)
}
