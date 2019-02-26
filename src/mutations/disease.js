import freshId from 'fresh-id'

export const saveDisease = async (_, args, context) => {
  const db = await context.getDb()
  const { _id, name } = args
  const existsDisease = await db.collection('disease').findOne({ name })
  if (existsDisease) throw new Error('disease already exists!')
  let result
  if (_id) {
    result = await db
      .collection('disease')
      .update({ _id }, { $set: { name, updatedAt: new Date() } })
  } else {
    result = await db.collection('disease').insert({ _id: freshId(), name })
  }
  context.response.set('effect-types', 'disease')
  return result.result.ok
}
