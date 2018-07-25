import moment from 'moment'
import { createPayHistory } from './payHistories'
import { findOrderById, updateOrder } from '../modules/order'
import { strip, convertTime } from './utils'

export const payNotify = async (ctx, next) => {
  let info = ctx.request.weixin
  const { transaction_id, out_trade_no, total_fee, time_end } = info
  const order = await findOrderById({ orderId: out_trade_no, payWay: 'WECHAT' })
  console.log(info, order, '@result')
  let replyResult = ''
  if (order) {
    const { orderStatus, totalPrice, patientId } = order
    if (orderStatus !== 'SUCCESS') {
      let setOrderObj = {}
      if (total_fee !== strip(totalPrice * 100)) {
        replyResult = '订单金额和微信商户金额不匹配'
        setOrderObj = {
          orderStatus: 'PAY_FAIL',
          errCode: '订单金额和微信商户金额不匹配',
        }
      } else {
        setOrderObj = {
          orderStatus: 'SUCCESS',
          transactionId: transaction_id,
          payAt: convertTime(time_end),
          serviceEndAt: moment(convertTime(time_end)).add(1, 'years')._d,
        }
      }
      await updateOrder({
        orderId: out_trade_no,
        setData: setOrderObj,
      })
      await createPayHistory({
        patientId,
        orderId: out_trade_no,
        result: info,
        type: 'pay_notification',
        status: setOrderObj.orderStatus,
      })
    }
  } else {
    replyResult = 'out_trade_no 在系统中不存在'
  }
  console.log(replyResult, '~~~')
  ctx.reply(replyResult)
}
