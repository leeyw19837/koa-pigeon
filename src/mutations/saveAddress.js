import { ObjectID } from 'mongodb'
import omit from 'lodash/omit'

export const saveAddress = async (_, args, context) => {
  const db = await context.getDb()
  const { address } = args
  let response = false
  if (address && address._id) {
    const addressTemp = omit(address, '_id')
    response = await db.collection('address').update(
      { _id: address._id },
      {
        $set:
        {
          ...addressTemp,
          updatedAt: new Date(),
        },
      },
    )
  } else {
    let result = await db.collection('address').insertOne({
      _id: new ObjectID().toHexString(),
      ...address,
      status: 'active',
      updatedAt: new Date(),
      createdAt: new Date(),
    })
    if (!!result.result.ok) {
      response = true
    } else {
      response = false
    }
  }
  return response
}

export const removeAddress = async (_, args, context) => {
  const db = await context.getDb()
  const { _id } = args
  let response = false
  if (_id) {
    response = await db.collection('address').update(
      { _id },
      {
        $set: {
          status: 'deleted',
          updatedAt: new Date(),
        }
      },
    )
  } else {
    throw new Error('找不到对应数据！')
  }
  return response
}
