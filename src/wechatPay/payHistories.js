import { ObjectID } from 'mongodb'

/**
 * 把订单和微信交付的每一步都记录到数据库，方便查询和追踪
 */
export const createPayHistory = async ({
  patientId,
  orderId,
  result,
  getDb,
  type = 'unifiedorder',
}) => {
  const db = await getDb()
  await db.collection('payHistories').insert({
    _id: new ObjectID().toString(),
    patientId,
    orderId,
    payResult: result,
    type,
    createdAt: new Date(),
  })
}
