import { ObjectID } from 'mongodb'
import moment from 'moment'
import { blogs } from '../queries/blogs'

const insertBonusPoint = async (sourceData, patientId) => {
  const defaultPoints = {
    _id: new ObjectID().toString(),
    patientId,
    source: sourceData,
    point: 2,
    expireAt: moment().add(367, 'days')._d,
    createdAt: new Date(),
  }
  const result = await db.collection('bonusPoints').insert(defaultPoints)
  return result
}

const createSharing = async ({
  patientId,
  name,
  type,
  recordId,
  shareWay,
  shareStatus,
}) => {
  const content = {
    _id: new ObjectID().toString(),
    patientId,
    shareWay,
    shareData: {
      name,
      type,
      recordId,
    },
    shareStatus,
    createdAt: new Date(),
  }
  await db.collection('sharing').insert(content)
  return content._id
}

const updateAchievementRecord = async (shareId, recordId) => {
  await db.collection('achievementRecords').update(
    {
      _id: recordId,
    },
    {
      $push: {
        shareTimes: shareId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  )
}

// 查询当前患者分享本条涨知识文章的次数
const userBlogShare = async (patientId, recordId) => {
  const cursor = {
    patientId, 'shareData.recordId': recordId
  }
  const blogs = await db
    .collection('sharing')
    .find(cursor)
    .toArray()
  return blogs
}

// 根据type判断，以Id查询分享的内容
const shareRecords = async (type, recordId) => {
  switch (type) {
    case 'KNOWLEDGE':
      const result = {}
      const blogsArray = await blogs()
      const blog = blogsArray.filter(b => b._id === recordId)
      if (blog) {
        const { type, title } = blog[0]
        result.type = type
        result.name = title
      }
      return result
    default:
      return {
        type,
        name: '活动内容'
      }
  }
}
// 根据type判断，调用插入积分的接口
const insertBonusPointByType = async (shareType, shareContentId, shareObj) => {
  const { patientId, type, name, shareWay, recordId } = shareObj
  const sourceData = {
    recordId,
    fromWay: shareWay,
    type,
    name,
    shareType,
  }
  switch (shareType) {
    case 'KNOWLEDGE':
      const blogShare = await userBlogShare(patientId, shareContentId)
      let times = 0
      if (blogShare) {
        times = blogShare.length
      }
      if (times < 6) {
        await insertBonusPoint(sourceData, patientId)
      }
    default:
      break
  }
}

export const addSharing = async (_, args, context) => {
  const db = await context.getDb()
  const { achievementRecordId, shareWay, shareStatus, shareType } = args

  const achieveRecord = await db
    .collection('achievementRecords')
    .findOne({ _id: achievementRecordId })
  let resultId = ''
  if (achieveRecord) {
    const {
      achievementId,
      shareTimes,
      _id,
      achievementDetails,
      patientId,
    } = achieveRecord

    const { type, name } = achievementDetails
    // create sharing
    const shareId = await createSharing({
      patientId,
      type,
      name,
      recordId: _id,
      shareWay,
      shareStatus,
    })
    resultId = shareId
    const achievement = await db.collection('achievements').findOne({
      _id: achievementId,
    })

    if (achievement) {
      const { shareWithBonusLimit } = achievement
      // Need add the bonusPoint
      if (shareTimes.length < shareWithBonusLimit && shareStatus === 'SUCCESS') {
        await insertBonusPoint(
          {
            recordId: shareId,
            fromWay: shareWay,
            type,
            name,
            shareType,
          },
          patientId,
        )
      }
    }
    // Update the shareTimes
    await updateAchievementRecord(shareId, achievementRecordId)
  } else {
    throw new Error('achievementRecord not existed')
  }
  return resultId
}

// 前端分享回调后，调用的确认接口
export const sharingConfirm = async (_, args, context) => {
  const db = await context.getDb()
  const { shareId, confirmStatus } = args
  return db.collection('sharing').update(
    {
      _id: shareId,
    },
    {
      $set: {
        shareStatus: confirmStatus,
        updatedAt: new Date(),
      },
    },
  )
}

// 添加分享数据的共通接口
export const addCommonSharing = async (_, args, context) => {
  const { patientId, shareType, recordId, shareWay, shareStatus } = args
  const shareRecode = await shareRecords(shareType, recordId)
  const { type, name } = shareRecode
  const shareObj = {
    patientId,
    type,
    name,
    recordId,
    shareWay,
    shareStatus,
  }
  // create sharing
  const shareId = await createSharing({
    patientId,
    name,
    type,
    recordId,
    shareWay,
    shareStatus,
  })
  shareObj.recordId = shareId
  insertBonusPointByType(shareType, recordId, shareObj)
  return shareId
}
