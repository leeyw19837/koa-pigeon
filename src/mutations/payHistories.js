import { ObjectID } from 'mongodb'

export const createPayHistory = async (_, args, context) => {
  const { patientId, orderId, payWay} = args

  await db.collection('payHistories').insertOne({
    _id: new ObjectID().toString(),
    patientId,
    orderId,
    payWay,
    status: 'SUCCESS',
    type: 'pay_on_delivery_note',
    createdAt: new Date(),
  })

  await db.collection('orders').update({
    orderId,
    patientId,
  },{
    $set:{
      orderStatus:'SUCCESS',
      updatedAt: new Date(),
    }
  })

  return true

}