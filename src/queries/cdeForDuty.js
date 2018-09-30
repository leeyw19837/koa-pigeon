export const cdeForDuty = async(_, args, {getDb}) => {
  let condition = {
    userId: args.assistantId
  }
  const db = await getDb()
  const cdes = await db
    .collection('certifiedDiabetesEducators')
    .find({})
    .toArray()

  console.log('*******', cdes)

  return cdes

}
