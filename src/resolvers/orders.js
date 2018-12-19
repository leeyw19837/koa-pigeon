export const Order = {
  payWay: async (order, _, {getDb}) => {
    const payHistory = await db.collection('payHistories').findOne({
      orderId: order.orderId,
    })
    if (payHistory) {
      return payHistory.payWay
    }
    return null
  }
}