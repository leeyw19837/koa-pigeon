export const orders = async (_, args, {getDb}) => {
  const db = await getDb()

  return db
    .collection('orders')
    .find({patientId: args.patientId, goodsType: 'ENTITY_GOODS', orderStatus: {$ne: 'DELETED'}})
    .toArray()
}

