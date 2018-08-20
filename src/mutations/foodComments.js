import freshId from 'fresh-id'
import { ObjectID } from 'mongodb'
import { pubsub } from '../pubsub'

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
  const commentId = freshId()
  const {foodCircleId, authorId} = args.comment
  // console.log('---saveFoodComments---',args)
  const resultComments = await db.collection('comments').insert({
    ...args.comment,
    _id: commentId,
    createdAt: new Date(),
  })

  const relatedFoods = await db
    .collection('foods')
    .findOne({ _id: args.comment.foodCircleId })

  const badgeId = new ObjectID().toString()
  const badgeCreatedAt = new Date()
  const patientId = relatedFoods.patientId
  const resultBadgeRecords = await db.collection('badgeRecords').insert({
    badgeId,
    recordId: commentId,
    badgeType: 'FOOD_MOMENTS',
    badgeState: 'UNREAD',
    recordType: !!args._operationDetailType ? args._operationDetailType : 'COMMENTS',
    mainContentId: foodCircleId,
    patientId: patientId,
    senderId: authorId,
    badgeCreatedAt,
  })

  pubsub.publish('foodDynamics', {
    ...relatedFoods,
    _operation: 'UPDATED',
    _operationDetailType: !!args._operationDetailType ? args._operationDetailType : 'COMMENTS',
    _recordId: commentId,
    badgeId,
    badgeCreatedAt,
  })
  return !!resultComments.result.ok && !!resultBadgeRecords.result.ok

}

