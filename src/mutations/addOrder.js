import freshId from 'fresh-id'
import moment from 'moment'
import { wechatPayServices } from '../wechatPay'
import * as orderServices from '../modules/order'
import { convertTime } from '../wechatPay/utils'
import { findGoodById } from '../modules/goods/index'
import { logger } from '../lib/logger';

export const addOrder = async (_, args, context) => {
  const db = await context.getDb()
  const {
    patientId,
    orderId,
    orderStatus,
    receiver,
    phoneNumber,
    receiveAddress,
    goodsType,
    goodsUnitPrice,
    goodsSpecification,
    purchaseQuantity,
    freightPrice,
    totalPrice,
  } = args
  let result = await db.collection('orders').insert({
    _id: freshId(),
    patientId,
    orderId,
    orderTime: new Date(),
    orderStatus: 'SUCCESSFUL',
    receiver,
    phoneNumber,
    receiveAddress,
    goodsType: 'BG1',
    goodsUnitPrice,
    goodsSpecification,
    purchaseQuantity,
    freightPrice,
    totalPrice,
    source: 'NEEDLE',
  })
  if (!!result.result.ok) {
    return true
  }
  return false
}

export const createPayOrder = async (_, args, context) => {
  const { patientId, totalPrice } = args
  const getDb = context.getDb
  const result = await wechatPayServices.createUnifiedOrder({
    data: {
      patientId,
      totalPrice,
    },
    getDb,
  })
  logger.log({level: 'info', message: 'create pre order', tag: 'wechat-pay', meta: result })
  return result
}

export const createOrder = async (_, args, context) => {
  const result = await orderServices.createOrder(args)
  return !result.errCode ? result : null
}

export const createPrepayForWechat = async (_, args, context) => {
  const { orderId, patientId, goodId } = args
  const goods = await findGoodById({ goodId })
  const { goodType, goodName, actualPrice } = goods
  const result = await wechatPayServices.createUnifiedOrder({
    totalPrice: actualPrice,
    goodsSpecification: goodName,
    orderId,
    patientId,
  })
  logger.log({level: 'info', message: 'create pre order', tag: 'wechat-pay', meta: result })
  return result
}

export const checkPayOrderStatus = async (_, args, context) => {
  const { orderId, type } = args
  const result = await wechatPayServices.queryUnifiedOrder({
    orderId,
    type: type || 'out_trade_no',
  })
  const { returnCode, trade_state, errCode, time_end, transaction_id } = result
  const tradeOrder = await orderServices.findOrderById({ orderId })
  const { orderStatus, patientId, goodsType } = tradeOrder
  if (orderStatus !== trade_state) {
    let setData = {
      orderStatus: trade_state,
    }
    if (trade_state === 'SUCCESS') {
      setData.payAt = convertTime(time_end)
      setData.serviceEndAt = moment(convertTime(time_end)).add(1, 'years')._d
      setData.transactionId = transaction_id
    }
    await orderServices.updateOrder({
      orderId,
      setData,
    })
  }
  // 如果确实支付成功，则更新用户表中的 membershipInformation 字段
  console.log('=========wechat trade_state=======', trade_state)
  if (trade_state === 'SUCCESS') {
    await orderServices.updateUserCollectionOrderFields({
      patientId,
      membershipInformation:{
        type: goodsType,
        serviceEndTime: moment(convertTime(time_end)).add(1, 'years')._d,
        methodOfPayment: 'WECHAT',
      }
    })
  }
  return {
    returnCode: errCode ? 'FAIL' : 'SUCCESS',
    tradeState: trade_state,
    errCode,
  }
}

export const updateOrder = async (_, args, context) => {
  const { orderId, setData } = args
  const data = await orderServices.updateOrder({
    orderId,
    setData,
  })

  logger.log({level: 'info', message: 'update order status', tag: 'wechat-pay', meta: args })
  return data.nModified === 1
}
