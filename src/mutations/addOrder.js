import freshId from 'fresh-id'
import moment from 'moment'
import {ObjectId} from 'mongodb'
import {wechatPayServices} from '../wechatPay'
import * as orderServices from '../modules/order'
import {convertTime} from '../wechatPay/utils'
import {findGoodById} from '../modules/goods/index'
import {logger} from '../lib/logger';

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

  // 增加商城：兼容老APP新数据结构，创建订单时，插入此字段。
  // 硬编码：从goods表中筛选出 iHealth 血糖试纸这个商品，撷取需要的字段
  const bgGoods = await db.collection('goods').findOne({_id: ObjectId.createFromHexString('5c0a1a9e4faaf3b3e4b6dc6c')})
  const {_id, couponFee, goodPictureUrl, goodSpecification, goodName} = bgGoods || {}
  const goodsListItem = {
    goodsId: _id,
    goodsName: goodName,
    goodsPrice: goodsUnitPrice,
    goodsTotalPrice: totalPrice,
    goodsDiscount: couponFee,
    goodsQuantity: purchaseQuantity,
    goodsImageUrl: goodPictureUrl,
    goodsSpecification: goodSpecification,
  }

  //增加订单过期时间
  const expiredTime = moment().add(24, "hours").toDate()

  let result = await db.collection('orders').insert({
    _id: freshId(),
    patientId,
    orderId,
    orderTime: new Date(),
    orderStatus: 'SUCCESS',
    receiver,
    phoneNumber,
    receiveAddress,
    goodsType: 'ENTITY_GOODS',
    goodsUnitPrice,
    goodsSpecification: '糖友商城商品',
    purchaseQuantity,
    freightPrice,
    totalPrice,
    source: 'NEEDLE',
    goodsList: [goodsListItem],
    expiredTime,
  })
  if (!!result.result.ok) {
    return true
  }
  return false
}

export const createPayOrder = async (_, args, context) => {
  const {patientId, totalPrice} = args
  console.log('createPayOrder', args)
  const getDb = context.getDb
  const result = await wechatPayServices.createUnifiedOrder({
    data: {
      patientId,
      totalPrice,
    },
    getDb,
  })
  logger.log({level: 'info', message: 'create pre order', tag: 'wechat-pay', meta: result})
  return result
}


export const createOrder = async (_, args, context) => {
  const result = await orderServices.createOrder(_, args, context)
  return !result.errCode ? result : null
}

export const createPrepayForWechat = async (_, args, context) => {
  const {orderId, patientId} = args
  console.log('createPrepayForWechat', args)

  const order = await orderServices.findOrderById({orderId})
  if (order) {
    const {goodsSpecification, totalPrice, freightPrice} = order
    const result = await wechatPayServices.createUnifiedOrder({
      totalPrice: totalPrice + (freightPrice || 0),
      goodsSpecification,
      orderId,
      patientId,
    })
    logger.log({level: 'info', message: 'create pre order', tag: 'wechat-pay', meta: result})
    return result
  } else {
    return false
  }
}

export const checkPayOrderStatus = async (_, args, context) => {
  const {orderId, type} = args
  const result = await wechatPayServices.queryUnifiedOrder({
    orderId,
    type: type || 'out_trade_no',
  })
  const {returnCode, trade_state, errCode, time_end, transaction_id} = result
  const tradeOrder = await orderServices.findOrderById({orderId})
  const {orderStatus, patientId, goodsType} = tradeOrder
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
      membershipInformation: {
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
  const {orderId, setData} = args
  const data = await orderServices.updateOrder({
    orderId,
    setData,
  })
  logger.log({level: 'info', message: 'update order status', tag: 'wechat-pay', meta: args})
  return data.nModified === 1
}

export const updateOrderList = async (_, args, context) => {
  const {orderId, setData} = args
  await orderServices.updateOrder({
    orderId,
    setData,
  })
  return true
}
