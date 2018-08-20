import { ObjectID } from 'mongodb'
import moment from 'moment'

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

export const addSharing = async (_, args, context) => {
  const db = await context.getDb()
  const { achievementRecordId, shareWay, shareStatus } = args

  const achieveRecord = await db
    .collection('achievementRecords')
    .findOne({ _id: achievementRecordId })

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
}
