import { getAlipaySign } from '../alipay/pay_alipay'
import { findGoodById } from '../modules/goods/index'

export const getAlipay = async (_, args) => {
  const { out_trade_no, patientId, goodId } = args
  const goods = await findGoodById({ goodId })
  const { goodName, actualPrice } = goods
  const order = {
    out_trade_no,
    subject: goodName,
    body: goodName,
    total_amount: actualPrice
  }
  const sign = await getAlipaySign(order, patientId)
  return { sign }
}
