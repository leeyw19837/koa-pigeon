import { ObjectID } from 'mongodb'

export const findOrderById = async ({ orderId }) => {
  const result = await db.collection('orders').findOne({
    orderId,
  })
  return result
}

/**
 * 当用户发起一个微信或者支付宝支付的时候，先在我们数据库插入一条订单记录
 * 后面再对试纸购买扩展
 * @param {*} ctx
 */
export const createOrder = async orderInfo => {
  const id = new ObjectID().toString()
  const { goodsType, source } = orderInfo
  const totalPrice =
    goodsType === 'DONGFANG_SERVICES' ? 299 : orderInfo.totalPrice
  const content = {
    _id: id,
    orderId: `ht_${id}`,
    orderTime: new Date(),
    orderStatus: 'INIT',
    createdAt: new Date(),
    source: source || 'NEEDLE',
    ...orderInfo,
    totalPrice,
  }

  const data = await db.collection('orders').insertOne(content)
  if (data.result.ok) {
    return content
  }
  return {
    errCode: 'insert error',
  }
}

export const updateOrder = async ({ orderId, setData }) => {
  await db.collection('orders').update(
    {
      orderId,
    },
    {
      $set: {
        ...setData,
        updatedAt: new Date(),
      },
    },
  )
  const result = await db.collection('orders').findOne({ orderId })
  return result
}
