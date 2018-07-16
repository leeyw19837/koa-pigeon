import { ObjectID } from 'mongodb'

export const findOrderById = async ({ orderId }) => {
  const result = await db.collection('orders').findOne({
    _id: orderId,
  })
  return result
}

/**
 * 当用户发起一个微信或者支付宝支付的时候，先在我们数据库插入一条订单记录
 * 后面再对试纸购买扩展
 * @param {*} ctx
 */
export const createOrder = async ({ orderInfo, getDb }) => {
  const db = await getDb()
  const { patientId, totalPrice } = orderInfo
  const id = new ObjectID().toString()
  const content = {
    _id: id,
    patientId,
    orderId: `tr_${id}`,
    orderTime: new Date(),
    orderStatus: 'INIT',
    payWay: 'WECHAT',
    receiver: '',
    phoneNumber: '',
    receiveAddress: '',
    goodsType: 'DONGFANG_SERVICES',
    goodsUnitPrice: 299,
    goodsSpecification: '299元/年',
    purchaseQuantity: 1,
    freightPrice: 0,
    totalPrice: 299,
    createdAt: new Date(),
  }

  const data = await db.collection('orders').insertOne(content)
  if (data.result.ok) {
    return content
  }
  return {
    errCode: 'insert error',
  }
}

export const updateOrder = async ({ getDb, orderId, data }) => {
  const db = getDb === undefined ? global.db : await getDb()
  const { returnCode, prepayid, transactionId } = data
  const setObj = {
    updatedAt: new Date(),
  }

  if (/PREPAY_SUCCESS/g.test(returnCode)) {
    setObj.prepayid = prepayid
  } else if (/PAY_NOTIFICTION_SUCCESS/g.test(returnCode)) {
    setObj.transactionId = transactionId
  }
  await db.collection('orders').update(
    {
      orderId: orderId,
    },
    {
      $set: setObj,
    },
  )
}
