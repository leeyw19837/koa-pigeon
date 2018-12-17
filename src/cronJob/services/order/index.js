import moment from 'dayjs' // The moment ALWAYS overwrite original object！fuck moment！

/**
 * 获取需要被设置过期状态的订单数据
 * @return {Promise<*>}
 */
export const getPresetOrders = async(frequncy) => {
  return await db
    .collection('orders')
    .find({
      orderTime: {$gte: moment().subtract(frequncy, "m")}
    })
    .toArray()
}
