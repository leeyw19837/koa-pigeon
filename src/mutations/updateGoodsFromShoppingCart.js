import { ObjectID } from 'mongodb'

/**
 * 更新购物车中商品数量（增/减）
 * @param _
 * @param args
 * @param getDb
 * @return {Promise<boolean>}
 */
export const updateGoodsFromShoppingCart = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId, goodsId, isAdd } = args

  console.log('updateGoodsFromShoppingCart', args)
  const existedGood = await db.collection('shoppingCart').findOne({
    patientId,
    goodsId,
  })
  if (existedGood) {
    if(isAdd){
      await db.collection('shoppingCart').update({
        patientId,
        goodsId,
      },{
        $set:{
          goodsQuantity: existedGood.goodsQuantity + 1,
          updatedAt: new Date(),
        }
      })
    }else {
      if (existedGood.goodsQuantity >0 ){
        await db.collection('shoppingCart').update({
          patientId,
          goodsId,
        },{
          $set:{
            goodsQuantity: existedGood.goodsQuantity - 1,
            updatedAt: new Date(),
          }
        })
      } else {
        throw new Error('商品数量最低为1，不能再减了！')
      }
    }
  } else {
    const shoppingCartGood = {
      _id: new ObjectID().toString(),
      patientId,
      goodsId,
      goodsQuantity:1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.collection('shoppingCart').insertOne(shoppingCartGood)
  }
  return true
}

/**
 * 从购物车中删除商品（物理删除）
 * @param _
 * @param args
 * @param getDb
 * @return {Promise<boolean>}
 */
export const deleteGoodsFromShoppingCart = async (_, args, { getDb }) => {
  const db = await getDb()
  const { patientId, goodsId } = args

  // const existedGood = await db.collection('shoppingCart').findOne({
  //   patientId,
  //   goodsId,
  // })
  // if (existedGood) {
  //
  // } else {
  //   throw new Error('错误！不存在此商品！')
  // }
  goodsId.forEach(async i=>{
    await db.collection('shoppingCart').delete({
      patientId,
      goodsId: i,
    })
  })
  return true;
}