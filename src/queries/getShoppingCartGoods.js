/**
 * 获取购物车商品
 * @param _
 * @param args
 * @return {Promise<*>}
 */
export const getShoppingCartGoods = async (_, args) => {
  const { patientId } = args
  return await db.collection('shoppingCart').find({
    patientId,
  }).toArray()
}


