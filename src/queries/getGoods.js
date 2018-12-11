import { findGoodById } from '../modules/goods/index'

export const getGoods = async (_, args) => {
  const { goodId, goodType } = args
  return findGoodById({ goodId, goodType })
}

export const getAllGoods = async (_, args) => {
  return await db.collection('goods').find({
    goodType:{$ne: 'ENTITY_GOODS'}
  }).toArray()
}

/**
 * 获取实物商品
 * @param _
 * @param args
 * @return {Promise<*>}
 */
export const getEntityGoods = async (_, args) => {
  return await db.collection('goods').find({
    goodType:'ENTITY_GOODS'
  }).toArray()
}


