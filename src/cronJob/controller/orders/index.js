import moment from 'moment'
export const verifyOrderValidity = async (frequency) => {
  await db
    .collection('orders')
    .updateMany({
      $or:[{orderStatus:'INIT'},{orderStatus:'PREPAY_FAILED'},{orderStatus:'PREPAY_SUCCESS'},{orderStatus:'NOTPAY'}],
      goodsType:'ENTITY_GOODS',
      source: 'NEEDLE',
      orderTime: {
        $gte: moment().subtract(frequency, "m")._d,
        $lte: moment()._d,
      }
    },{
      $set: {
        orderStatus: 'CANCEL',
        updatedAt: new Date(),
      }
    })
  return true
}