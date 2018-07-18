import { ObjectID } from 'mongodb'

/**
 * 把订单和微信交付的每一步都记录到数据库，方便查询和追踪
 */
export const createPayHistory = async ({
  orderId,
  result,
  status,
  type = 'unifiedorder',
  payWay = 'WECHAT',
}) => {
  await db.collection('payHistories').insertOne({
    _id: new ObjectID().toString(),
    orderId,
    payResult: result,
    type,
    status,
    payWay,
    createdAt: new Date(),
  })
}
