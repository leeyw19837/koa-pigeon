import {
  getPresetOrders
} from '../../services/order'
import moment from 'dayjs'
export const verifyOrderValidity = async (frequncy = 5) => {
  await db
    .collection('orders')
    .updateMany({
      orderTime: {
        $gte: moment().subtract(frequncy, "m").toDate(),
        $lte: moment().toDate(),
      }
    },{
      $set: {
        'orderStatus': 'CANCEL',
      }
    })
  return true
}