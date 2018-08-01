import moment from 'moment'
import { createPayHistory } from '../wechatPay/payHistories'
import { findOrderById, updateOrder } from '../modules/order'
import { strip, convertTime } from '../wechatPay/utils'
import { makeNotifyResponseMethod } from '../alipay/pay_alipay'

export const aliPayNotify = async (ctx) => {
  const info = ctx.request.body
  const notifyResponse = makeNotifyResponseMethod(info)
  let replyResult = 'failure'
  if (!notifyResponse) {
    return replyResult
  }
  const { trade_no, out_trade_no, total_amount, gmt_payment } = info
  const time_end = moment(gmt_payment).format('YYYYMMDDHHmmss')
  const order = await findOrderById({ orderId: out_trade_no, payWay: 'ALIPAY' })
  if (order) {
    const { orderStatus, totalPrice, patientId } = order
    if (orderStatus !== 'SUCCESS') {
      let setOrderObj = {}
      if (+total_amount !== strip(totalPrice)) {
        errCode = '订单金额和支付宝金额不匹配'
        setOrderObj = {
          orderStatus: 'PAY_FAIL',
          errCode: '订单金额和支付宝金额不匹配',
        }
        replyResult = 'failure'
      } else {
        setOrderObj = {
          payWay: 'ALIPAY',
          orderStatus: 'SUCCESS',
          transactionId: trade_no,
          payAt: convertTime(time_end),
          serviceEndAt: moment(convertTime(time_end)).add(1, 'years')._d,
        }
        replyResult = 'SUCCESS'
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
    replyResult = 'failure'
  }
  return replyResult
}