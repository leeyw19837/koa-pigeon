const tenpay = require('tenpay')
const moment = require('moment')
const omit = require('lodash/omit')
import { sign, generate, getTimeStamp, strip } from './utils'
import { createPayHistory } from './payHistories'
import { findOrderById, updateOrder } from '../modules/order'

export * from './notify'

const {
  WX_APP_ID = 'wx915efa8b538a4df4',
  WX_MCH_ID = '1509472271',
  WX_API_KEY = '36151ce128b3f61bb7edde68da5ad935',
  WX_NOTIFY_URL = 'https://pigeon-wechat.gtzh-stg.ihealthcn.com/api/wechat-pay',
} = process.env

export const config = {
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
      console.log('isSandbox')
      this.wechatPayApi = await tenpay.sandbox(config)
    } else {
      this.wechatPayApi = wechatPayment
    }
  }
  async createUnifiedOrder(orderInfo) {
    await this.getWechatServices()
    const { totalPrice, goodsSpecification, orderId, patientId } = orderInfo
    const params = {
      body: goodsSpecification || '共同照护-综合服务费',
      out_trade_no: orderId,
      total_fee: strip(0.01 * 100),
      trade_type: 'APP',
    }
    let prePayParams = {}
    let prepayid = ''
    try {
      const result = await this.wechatPayApi.unifiedOrder(params)
      const { prepay_id } = result
      const appParams = this.wechatPayApi.getAppParamsByPrepay({
        prepay_id,
      })
      prepayid = prepay_id
      prePayParams = {
        returnCode: 'PREPAY_SUCCESS',
        ...omit(appParams, 'package'),
        packageName: appParams.package,
      }
    } catch (error) {
      prePayParams = {
        returnCode: 'PREPAY_FAIL',
        errCode: error,
      }
    }
    await updateOrder({
      orderId,
      data: {
        orderStatus: prePayParams.returnCode,
        prepayid,
        payWay: 'WECHAT',
      },
    })

    await createPayHistory({
      patientId,
      orderId,
      result: prePayParams,
      type: 'unifiedorder',
      status: prePayParams.returnCode,
      payWay: 'WECHAT',
    })

    return prePayParams
  }
  async queryUnifiedOrder({ orderId, type = 'out_trade_no' }) {
    await this.getWechatServices()
    const params =
      type === 'out_trade_no'
        ? { out_trade_no: orderId }
        : { transaction_id: orderId }
    let payOrder = {}
    try {
      payOrder = await this.wechatPayApi.orderQuery(params)
      payOrder.returnCode = 'SUCCESS'
    } catch (error) {
      payOrder = {
        returnCode: 'FAIL',
        errCode: error,
      }
    }
    return payOrder
  }
  async queryTradeOrder({ orderId, type = 'out_trade_no' }) {
    let tradeOrder = await findOrderById({ orderId })
    const { orderStatus } = tradeOrder
    const ignoreStatus = ['SUCCESS', 'REFUND', 'CLOSED']
    if (ignoreStatus.indexOf(orderStatus) < 0) {
      const transactionOrder = await this.queryUnifiedOrder({ orderId })
      const { errCode, trade_state, transaction_id } = transactionOrder
      if (!errCode && trade_state !== orderStatus) {
        tradeOrder = await updateOrder({
          orderId,
          data: {
            returnCode: trade_state,
            transactionId: transaction_id,
          },
        })
      }
    }
    return tradeOrder
  }
}

export const wechatPayServices = new WeChatPay()
