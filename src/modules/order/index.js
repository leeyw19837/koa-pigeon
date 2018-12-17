import { ObjectId, ObjectID } from 'mongodb'
import moment from 'moment'
import { findGoodById } from '../goods/index'
import  { deleteGoodsFromShoppingCart } from '../../mutations/updateGoodsFromShoppingCart'

export const findOrderById = async ({ orderId }) => {
  const result = await db.collection('orders').findOne({
    orderId,
  })
  return result
}

/**
 * 当用户发起一个微信或者支付宝支付的时候，先在我们数据库插入一条订单记录
 * 后面再对试纸购买扩展
 * @param _
 * @param args
 * @param context
 * @return {Promise<*>}
 */
export const createOrder = async (_, args, context) => {
  console.log('----args----', args)
  const id = new ObjectID().toString()
  const { goodId, source, patientId, goodsType, goodsList, goodsReceiverInfos } = args

  console.log('===createOrder===', args)

  const goods = await findGoodById({ goodId })
  const { goodType, goodName, actualPrice } = goods || {}

  let content = {
    _id: id,
    orderId: `ht_${id}`,
    orderTime: new Date(),
    orderStatus: 'INIT',
    createdAt: new Date(),
    source: source || 'NEEDLE',
    patientId,
    goodsType: goodType,
    goodsSpecification: goodName,
    totalPrice: actualPrice,
  }

  // 对于试纸包年装（会员商品）服务，不传入此字段(goodsList)
  // 对于从商城购买的商品，加入此字段(goodsList)，这样在订单页面能够显示出来订单的状态
  if (goodsList && goodsType){
    let totalPrice = 0
    goodsList.forEach(i=>{
      totalPrice += parseFloat(i.goodsTotalPrice)
    })
    const expiredTime = moment().add(24, "hours").toDate()
    content = {...content, freightPrice: 10, goodsType, goodsSpecification:'糖友商城商品', totalPrice, goodsList, ...goodsReceiverInfos, expiredTime}

    // 创建订单同时将购物车中的商品删除
    const goodsIds = goodsList.map(i=>i.goodsId)
    await deleteGoodsFromShoppingCart(null, {patientId, goodsIds}, context )
  }

  const db = await context.getDb()
  const data = await db.collection('orders').insertOne(content)
  if (data.result.ok) {
    return content
  }
  return {
    errCode: 'insert error',
  }
}

export const updateOrder = async ({ orderId, setData }) => {
  await db.collection('orders').update(
    {
      orderId,
    },
    {
      $set: {
        ...setData,
        updatedAt: new Date(),
      },
    },
  )
  const result = await db.collection('orders').findOne({ orderId })
  return result
}

export const updateUserCollectionOrderFields = async ({ patientId, membershipInformation }) => {
  console.log('updateUserCollectionOrderFields called!', patientId, membershipInformation)
  const result = await db.collection('users').update(
    {
      _id: ObjectId.createFromHexString(patientId),
    },
    {
      $set: {
        membershipInformation,
        updatedAt: new Date(),
      },
    },
  )
  return result
}
