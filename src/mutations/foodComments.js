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
  const resultComments = await db.collection('comments').insert({
    ...args.comment,
    _id: commentId,
    createdAt: new Date(),
  })

  const badgeId = new ObjectID().toString()
  const badgeCreatedAt = new Date()
  const resultBadgeRecords = await db.collection('badgeRecords').insert({
    badgeId,
    recordId: commentId,
    badgeType: 'FOOD_MOMENTS',
    badgeState: 'AVAILABLE',
    recordType: args._operationDetailType,
    mainContentId: foodCircleId,
    patientId:args.patientId,
    senderId:authorId,
    isRead:false,
    badgeCreatedAt,
  })

  const relatedFoods = await db
    .collection('foods')
    .findOne({ _id: args.comment.foodCircleId })
  pubsub.publish('foodDynamics', {
    ...relatedFoods,
    _operation: 'UPDATED',
    _operationDetailType:args._operationDetailType,
    _recordId: commentId,
    badgeId,
    badgeCreatedAt,
  })
  return !!resultComments.result.ok && !!resultBadgeRecords.result.ok

}

