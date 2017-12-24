import freshId from 'fresh-id'

export const addSentence = async (_, args, context) => {
    const db = await context.getDb()

  const { category, group, segment, dependence, value, usedFor } = args

  const userId = '66728d10dc75bc6a43052036' // TODO

  const newSentence = {
    _id: freshId(),
    category,
    group,
    segment,
    dependence,
    value,
    usedFor,
    author: userId,
    createdAt: new Date(),
  }

  const result = await db.collection('sentences').insertOne(newSentence)
  return !!result.result.ok
  }
  
  export const removeSentence = async (_, { _id }, context) => {
    const db = await context.getDb()
  
    const result = await db.collection('sentences').remove({ _id })
    return !!result.result.ok
  }
  