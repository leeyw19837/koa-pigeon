import { createPayHistory } from './payHistories'
import { findOrderById, updateOrder } from './orders'

export const payNotify = async (ctx, next) => {
  let info = ctx.request.weixin
  const { transaction_id, out_trade_no, total_fee, result_code } = info
  const order = await findOrderById({ orderId: out_trade_no })
  let replyResult = ''
  if (order) {
    const { orderStatus, payWay, totalPrice } = order
    if (orderStatus !== 'PAY_NOTIFICTION_SUCCESS' && payWay === 'WECHAT') {
      await updateOrder({
        orderId: out_trade_no,
        data: {
          returnCode: `PAY_NOTIFICTION_${result_code}`,
          transactionId: transaction_id,
          feeAndPriceMatch: total_fee * 100 === totalPrice,
        },
      })

      await createPayHistory({
        orderId: out_trade_no,
        result: info,
        type: 'pay_notifiction',
        status: result_code,
      })
    } else {
      replyResult = 'PAY_NOTIFICTION_FAIL'
    }
  } else {
    replyResult = 'out_trade_no 在系统中不存在'
  }
  ctx.reply(replyResult)
}
