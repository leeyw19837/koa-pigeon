import { getAlipaySign } from '../alipay/pay_alipay'
import { findGoodById } from '../modules/goods/index'
import {wechatPayServices} from "../wechatPay";
import * as orderServices from "../modules/order";

export const getAlipay = async (_, args) => {
  const { out_trade_no, patientId, goodId } = args
  const orderFromDB = await orderServices.findOrderById({ orderId: out_trade_no })
  const { goodsSpecification, totalPrice, freightPrice } = orderFromDB
  const order = {
    out_trade_no,
    subject: goodsSpecification,
    body: goodsSpecification,
    total_amount: totalPrice + (freightPrice || 0),
  }
  const sign = await getAlipaySign(order, patientId)
  return { sign }
}
