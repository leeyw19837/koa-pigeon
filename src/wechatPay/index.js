const tenpay = require('tenpay')
import { createOrder } from './orders'
import { sign, generate, getTimeStamp } from './utils'
import { createPayHistory } from './payHistories'

export * from './notify'

const {
  WX_APP_ID = 'wx915efa8b538a4df4',
  WX_MCH_ID = '1509472271',
  WX_API_KEY = '36151ce128b3f61bb7edde68da5ad935',
  WX_NOTIFY_URL = 'https://pigeon.gtzh-stg.ihealthcn.com/wechat-pay',
} = process.env

const config = {
  appid: WX_APP_ID,
  mchid: WX_MCH_ID,
  partnerKey: WX_API_KEY,
  spbill_create_ip: '192.168.1.1',
}

export const wechatPayApi = new tenpay(config)

class WeChatPay {
  constructor() {
    this.package = 'Sign=WXPay'
    this.wechatPayApi = wechatPayApi
  }
  async createUnifiedOrder({ data, getDb }) {
    const orderData = await createOrder({
      orderInfo: data,
      getDb,
    })
    if (orderData.errCode) {
      throw new Error('订单插入失败')
      return
    }
    const { orderId, totalPrice } = orderData
    const params = {
      body: '护血糖-年费',
      out_trade_no: orderId,
      total_fee: 1,
      trade_type: 'APP',
    }
    const result = await this.wechatPayApi.unifiedOrder(params)
    const { return_code, prepay_id, result_code } = result
    let returnObj = {
      returnCode: 'PREPAY_ERROR',
    }
    if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
      returnObj = {
        returnCode: 'PREPAY_SUCCESS',
        appid: WX_APP_ID,
        partnerid: WX_MCH_ID,
        prepayid: prepay_id,
        package: this.package,
        noncestr: generate(),
        timestamp: getTimeStamp(),
        sign: sign(params, WX_API_KEY),
      }
    }
    await updateOrder({
      orderId,
      getDb,
      data: returnObj,
    })
    await createPayHistory({
      patientId,
      orderId,
      result,
      getDb,
      type: 'unifiedorder',
    })
    return returnObj
  }
}

export const wechatPayServices = new WeChatPay()
