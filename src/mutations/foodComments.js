import freshId from 'fresh-id'
import moment from 'moment'
import { ObjectID } from 'mongodb'
import { pubsub } from '../pubsub'
import { insertFoodMessagesIntoChat } from '../utils/insertNeedleChatMessage'

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
  const author = await db
    .collection('users')
    .findOne({ _id: { $in: [ObjectID(authorId), authorId] } }, { roles: 1 })
  const taskId = freshId()
  if (!author.roles) {
    const now = new Date()
    const newTask = {
      _id: taskId,
      state: 'PENDING',
      createdAt: now,
      updatedAt: now,
      type: 'FOOD_CIRCLE',
      foodId: foodCircleId,
      desc: `${moment(now).format('MM-DD HH:mm')} 写了一条新的评论`,
      patientId: authorId,
    }
    const userInfo = await db.collection('users').findOne({ _id: ObjectId(patientId) })
    if (userInfo.patientState && userInfo.patientState !== 'ARCHIVED'){
      await db.collection('interventionTask').insert(newTask)
      const relatedFoods = await db
        .collection('foods')
        .findOne({ _id: foodCircleId })
      pubsub.publish('interventionTaskDynamics', {
        ...newTask,
        _operation: 'ADDED',
      })
      pubsub.publish('foodDynamics', {
        ...relatedFoods,
        _operation: 'UPDATED',
        _senderRole: author.roles,
      })
    }
  }

  //聊天页面插入task气泡
  // const textContent = '写了一条新的评论'
  // const sendArgs = {
  //   taskId,
  //   patientId: authorId,
  //   textContent,
  //   sourceType: 'FROM_SYSTEM',
  //   taskType: 'FOOD_CIRCLE',
  // }
  // await insertChat(_, sendArgs, context)

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

export const saveFoodComments = async (_, args, context) => {
  const db = await context.getDb()
  const commentId = freshId()
  const { foodCircleId, authorId } = args.comment
  const foods = await db.collection('foods').findOne({ _id: foodCircleId })
  const userId = foods && foods.patientId
  const user = await db.collection('users').findOne({ _id: ObjectID(userId) })
  const cdeId = user && user.cdeId
  const cdeInfo = await db.collection('certifiedDiabetesEducators').findOne({ _id: cdeId })
  const condition = {
    ...args.comment,
    _id: commentId,
    createdAt: new Date(),
  }
  if (cdeInfo) {
    condition.belongCdeId = cdeInfo.userId
    condition.belongCdeName = cdeInfo.nickname
  }
  const resultComments = await db.collection('comments').insert(condition)

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
    recordType: !!args._operationDetailType
      ? args._operationDetailType
      : 'COMMENTS',
    mainContentId: foodCircleId,
    patientId: patientId,
    senderId: authorId,
    badgeCreatedAt,
  })

  const author = await db
    .collection('users')
    .findOne({ _id: { $in: [ObjectID(authorId), authorId] } }, { roles: 1 }) || {}

  pubsub.publish('foodDynamics', {
    ...relatedFoods,
    _operation: 'UPDATED',
    _operationDetailType: !!args._operationDetailType
      ? args._operationDetailType
      : 'COMMENTS',
    _recordId: commentId,
    badgeId,
    badgeCreatedAt,
    _senderRole: author.roles,
  })

  //app端聊天页面插入饮食卡片
  await insertFoodMessagesIntoChat(_, {
    patientId,
    senderId: authorId,
    shouldQueryTotalScore: true,
    foodCircleId,
    sourceType: 'FROM_WEB_CDE_SCORES_AND_COMMENTS'
  }, context)
  return !!resultComments.result.ok && !!resultBadgeRecords.result.ok
}
