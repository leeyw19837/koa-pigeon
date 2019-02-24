import freshId from 'fresh-id'

export const saveDisease = async (_, { _id, name }, { getDb }) => {
  const db = await getDb()

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

  return result.result.ok
}
