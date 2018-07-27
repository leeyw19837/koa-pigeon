import { getAlipaySign } from '../alipay/pay_alipay'

export const getAlipay = async (_, args) => {
  const { out_trade_no, subject, body, total_amount } = args
  const order = {
    out_trade_no,
    subject,
    body,
    total_amount
  }
  const sign = await getAlipaySign(order)
  return { sign }
}
