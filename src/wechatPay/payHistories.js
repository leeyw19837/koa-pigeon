import { ObjectID } from 'mongodb'

/**
 * 把订单和微信交付的每一步都记录到数据库，方便查询和追踪
 */
export const createPayHistory = async insertData => {
  await db.collection('payHistories').insertOne({
    _id: new ObjectID().toString(),
    ...insertData,
    createdAt: new Date(),
  })
}
