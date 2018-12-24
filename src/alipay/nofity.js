import moment from 'moment'
import { createPayHistory } from '../wechatPay/payHistories'
import {findOrderById, updateOrder, updateUserCollectionOrderFields} from '../modules/order'
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
    const { orderStatus, totalPrice, frightPrice = 0, patientId, goodsType } = order
    if (orderStatus !== 'SUCCESS') {
      let setOrderObj = {}
      if (+total_amount !== strip(totalPrice + frightPrice)) {
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

      // 如果不是实物商品，则更新user表中会员相关字段
      if (goodsType !== 'ENTITY_GOODS'){
        await updateUserCollectionOrderFields({
          patientId,
          membershipInformation:{
            type: goodsType,
            serviceEndTime: moment(convertTime(time_end)).add(1, 'years')._d,
            methodOfPayment: 'ALIPAY',
          }
        })
      }

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
