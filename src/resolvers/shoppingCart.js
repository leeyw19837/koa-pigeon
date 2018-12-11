import { ObjectID } from 'mongodb'

export const ShoppingCart = {
  goods: async (shoppingCart, _, { getDb }) => {
    // console.log('===shoppingCart====',shoppingCart)
    const db = await getDb()
    const goodsCursor = {
      _id: ObjectID.createFromHexString(shoppingCart.goodsId)
    }
    const result = await db
      .collection('goods')
      .findOne(goodsCursor)
    // console.log('===result===', result)
    return result
  },
}