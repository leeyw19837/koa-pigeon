import freshId from 'fresh-id'
const moment = require('moment')

export const addOutHospitalSoap = async (_, args, context) => {
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
  let result = await db.collection('addOrder').insert({
    _id: freshId(),
    patientId,
    orderId,
    orderTime: new Date(),
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
  })
  if (!!result.result.ok) {
    console.log('保存成功了哈哈哈哈哈-------')
    return true
  }
  console.log('保存失败了哈哈哈哈哈-------')
  return false
}
