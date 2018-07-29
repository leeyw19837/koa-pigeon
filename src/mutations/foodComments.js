import freshId from 'fresh-id'

export const addFoodComments = async (_, args, context) => {
  const db = await context.getDb()
  const {
    foodCircleId,
    commentContent,
    authorId,
    authorName,
    type,
    commentIds,
    replyId,
    replyName,
  } = args
  let result = await db.collection('comments').insert({
    _id: freshId(),
    foodCircleId,
    commentContent,
    authorId,
    authorName,
    type,
    commentIds,
    replyId,
    replyName,
    createdAt: new Date(),
  })
  return !!result.result.ok
}

export const deleteFoodComments = async (_, args, context) => {
  const db = await context.getDb()
  const { _id } = args
  let result = await db.collection('comments').remove({ _id })
  if (!!result.result.ok) {
    return true
  }
  return false
}

export const saveFoodComments = async (_, args, { getDb }) => {
  const db = await getDb()
  const result = await db.collection('comments').insert({
    ...args.comment,
    _id: freshId(),
    createdAt: new Date(),
  })
  return !!result.result.ok
}
