import { findGoodById } from '../modules/goods/index'

export const getGoods = async (_, args) => {
  const { goodId, goodType } = args
  return findGoodById({ goodId, goodType })
}
