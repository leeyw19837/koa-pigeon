export const cdeDutyAdjective = async(_, args, {getDb}) => {
  const db = await getDb()
  const adjs = await db
    .collection('cdeDutyAdjective')
    .find({state: true})
    .toArray()

  console.log('adjs', adjs)

  return adjs[0].adjective
}
