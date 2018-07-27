const fs = require('fs')
var path = require('path')
const Alipay = require('alipay-mobile')

const read = filename => {
  return fs.readFileSync(path.resolve(__dirname, filename))
}
const options = {
  app_id: '2018071060512883',
  appPrivKeyFile: read('./config/alipay_private_key.pem'),
  alipayPubKeyFile: read('./config/alipay_public_key.pem'),
  notify_url: 'https://pigeon-wechat.gtzh-stg.ihealthcn.com/api/alipay'
}
const service = new Alipay(options)
//获取支付宝签名
export const getAlipaySign = async (order) => {
  await createPayHistory({
    patientId,
    orderId: order.out_trade_no,
    result: order,
    type: 'unifiedorder',
    status: 'INIT',
    payWay: 'ALIPAY',
  })
  const result = await service.createOrder(order)
  return result.data
}
//查询支付宝订单
export const checkAlipayOrderMethod = async (outTradeNo) => {
  const result = await service.queryOrder({ out_trade_no: outTradeNo })
  return result
}

