import { ObjectID } from 'mongodb'

export const getOrderReceiverInfo = async  (_, args, context) => {
    const db = await context.getDb();
    const { patientId} = args;
    if (!patientId) {
        throw new Error('You must be logged in to update devices')
    }
    const user = await db
        .collection('users')
        .findOne({ _id: ObjectID.createFromHexString(patientId) });
    if (!user) {
        throw new Error("You don't exist")
    }

    const orderInfo = await db.collection('orders').find({ patientId: patientId })
        .sort({orderTime:-1})
        .toArray();
    if(orderInfo){
        return orderInfo[0]
    } else {
          return {}
    }

};