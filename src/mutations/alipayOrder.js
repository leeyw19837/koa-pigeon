import { checkAlipayOrderMethod } from '../alipay/pay_alipay'
import * as orderServices from '../modules/order'
import { convertTime } from '../wechatPay/utils'
import moment from 'moment'
import {updateUserCollectionOrderFields} from "../modules/order";

export const checkAlipayOrder = async (_, args, context) => {
  const { out_trade_no } = args
  const result = await checkAlipayOrderMethod(out_trade_no)
  const { data } = result
  let message = data.msg
  const trade_no = data.trade_no
  const send_pay_date = moment(data.send_pay_date).format('YYYYMMDDHHmmss')
  const tradeOrder = await db.collection('orders').findOne({
    orderId: out_trade_no,
  })
  const { orderStatus, patientId, goodsType } = tradeOrder
  if (data.msg === 'Success') {
    message = 'SUCCESS'
  } else {
    message = 'INIT'
  }
  if (orderStatus !== message) {
    let setData = {
      orderStatus: message,
      payWay: 'ALIPAY',
    }
    if (message === 'SUCCESS') {
      setData.payAt = convertTime(send_pay_date)
      setData.serviceEndAt = moment(convertTime(send_pay_date)).add(1, 'years')._d
      setData.transactionId = trade_no
    }
    await orderServices.updateOrder({
      orderId: out_trade_no,
      setData,
    })
  }
  // 如果确实支付成功，则更新用户表中的 membershipInformation 字段
  console.log('=========alipay message=======', message)
  if (message === 'SUCCESS') {
    await updateUserCollectionOrderFields({
      patientId,
      membershipInformation:{
        type: goodsType,
        serviceEndTime: moment(convertTime(send_pay_date)).add(1, 'years')._d,
        methodOfPayment: 'ALIPAY',
      }
    })
  }
  return {
    tradeState: message,
    code: data.code,
    msg: data.msg,
  }
}