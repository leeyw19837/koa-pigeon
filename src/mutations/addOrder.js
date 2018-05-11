import freshId from 'fresh-id'

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
    source: 'NEEDLE',
  })
  if (!!result.result.ok) {
    return true
  }
  return false
}
