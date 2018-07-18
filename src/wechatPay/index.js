const tenpay = require('tenpay')
import { sign, generate, getTimeStamp, strip } from './utils'
import { createPayHistory } from './payHistories'
import { findOrderById, updateOrder, createOrder } from './orders'

export * from './notify'

const {
  WX_APP_ID = 'wx915efa8b538a4df4',
  WX_MCH_ID = '1509472271',
  WX_API_KEY = '36151ce128b3f61bb7edde68da5ad935',
  WX_NOTIFY_URL = 'https://pigeon-wechat.gtzh-stg.ihealthcn.com/api/wechat-pay',
} = process.env

const config = {
  appid: WX_APP_ID,
  mchid: WX_MCH_ID,
  partnerKey: WX_API_KEY,
  notify_url: WX_NOTIFY_URL,
  spbill_create_ip: '192.168.1.1',
}

export const wechatPayment = new tenpay(config)

class WeChatPay {
  constructor(isSandbox) {
    this.package = 'Sign=WXPay'
    this.isSandbox = isSandbox
  }
  async getWechatServices() {
    if (this.isSandbox) {
      this.wechatPayApi = await tenpay.sandbox(config)
    } else {
      this.wechatPayApi = wechatPayment
    }
  }
  async createUnifiedOrder({ data, getDb }) {
    await this.getWechatServices()
    const orderData = await createOrder({
      orderInfo: data,
      getDb,
    })
    if (orderData.errCode) {
      throw new Error('订单插入失败')
      return
    }
    const { orderId, totalPrice, patientId } = orderData
    const params = {
      body: '护血糖-年费',
      out_trade_no: orderId,
      total_fee: strip(totalPrice * 100),
      trade_type: 'APP',
    }
    let returnObj = {}
    let setOrderObj = {}
    let result = {}
    try {
      result = await this.wechatPayApi.unifiedOrder(params)
      console.log(result)
      const { prepay_id } = result
      returnObj = {
        returnCode: 'PREPAY_SUCCESS',
        appid: WX_APP_ID,
        partnerid: WX_MCH_ID,
        prepayId: prepay_id,
        package: this.package,
        noncestr: generate(),
        timestamp: getTimeStamp(),
        sign: sign(params, WX_API_KEY),
      }
    } catch (error) {
      console.log(error, '~~~~')
      returnObj = {
        errCode: error,
      }
    }

    await updateOrder({
      orderId,
      data: returnObj,
    })
    await createPayHistory({
      patientId,
      orderId,
      result: returnObj.errCode ? returnObj : result,
      type: 'unifiedorder',
    })
    return returnObj
  }
  async queryUnifiedOrder({ orderId, type = 'transaction' }) {
    await this.getWechatServices()
    const params =
      type === 'transaction'
        ? { transaction_id: orderId }
        : { out_trade_no: orderId }

    try {
      const result = await api.orderQuery(params)
      const { result_code, return_code, out_trade_no, trade_state } = result
      const order = await findOrderById({ orderId: out_trade_no })
      const { orderStatus, totalPrice } = order
      console.log(orderStatus, trade_state)
    } catch (error) {
      console.log(error)
    }
  }
}

export const wechatPayServices = new WeChatPay()
