import { ObjectID } from 'mongodb'

export const findGoodById = async ({ goodId, goodType }) => {
  const cursor = {}
  if (goodId) cursor['_id'] = ObjectID.createFromHexString(goodId)
  if (goodType) cursor['goodType'] = goodType
  const result = await db.
    collection('goods').findOne(cursor)
  return result
}
