import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'

export const saveNewQA = async (_, args, context) => {
  const db = await context.getDb()
  // 把qa保存起来
  const { q, a, msgId, cdeId, cdeName } = args

  // query sender detail information
  const msg = await db.collection('needleChatMessages').findOne({ _id: msgId })
  const sender = await db
    .collection('users')
    .findOne({ _id: ObjectId.createFromHexString(msg.senderId) })
  // query hospital
  const healthCareTeam = await db.collection('healthCareTeams').findOne({
    _id: sender.healthCareTeamId[0],
  })

  await db.collection('aiChatQA').insertOne({
    _id: freshId(),
    q,
    a,
    patientId: msg.senderId,
    questioner: sender.nickname,
    hospital: healthCareTeam.institutionName,
    msgId,
    cdeId,
    cdeName,
    approved: 0,
    approvedUser: null,
    createdAt: new Date(),
    approvedAt: null,
  })
  return true
}
