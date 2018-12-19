import {
  getPresetOrders
} from '../../services/order'
import moment from 'dayjs'
export const verifyOrderValidity = async (frequency) => {
  console.log('verifyOrderValidity called', frequency)
  const result = await db
    .collection('orders')
    .updateMany({
      // orderStatus:{'INIT'
      orderTime: {
        $gte: moment().subtract(frequency, "m").toDate(),
        $lte: moment().toDate(),
      }
    },{
      $set: {
        'orderStatus': 'CANCEL',
      }
    })

  return true
}