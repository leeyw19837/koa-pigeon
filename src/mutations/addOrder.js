import freshId from 'fresh-id'
import { wechatPayServices } from '../wechatPay'

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
  console.log(result, '@@@@@result')
  return result
}
