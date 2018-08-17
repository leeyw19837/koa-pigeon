import { maybeCreateFromHexString } from '../utils'
import { ObjectId } from 'mongodb'
import { whoAmI } from '../modules/chat'

export const NeedleChatRoom = {
  async participants(needleChatRoom, _, { getDb }) {
    const db = await getDb()

    let users = []

    for (const participant of needleChatRoom.participants) {
      // TODO(tangweikun) Hard Cord should replace of healthCareProfessional id
      if (participant.userId === '66728d10dc75bc6a43052036') {
        const healthCareProfessional = await db
          .collection('users')
          .findOne({ _id: participant.userId })
        users.push(healthCareProfessional)
      } else {
        const patient = await db
          .collection('users')
          .findOne({ _id: maybeCreateFromHexString(participant.userId) })
        users.push(patient)
      }
    }

    return users
  },
  async messages(needleChatRoom, args, { getDb }) {
    const db = await getDb()

    const { before = new Date('2999/01/01'), limit } = args

    const messages = await db
      .collection('needleChatMessages')
      .find({
        chatRoomId: needleChatRoom._id,
        createdAt: { $lt: new Date(before) },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return messages.reverse()
  },
  async latestMessage(needleChatRoom, _, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    const messageArray = await db
      .collection('needleChatMessages')
      .find({ chatRoomId: needleChatRoom._id })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    return messageArray[0] || null
  },
  async unreadMessageCount(needleChatRoom, args, { getDb }) {
    const db = getDb === undefined ? global.db : await getDb()
    const userId = args.userId || '66728d10dc75bc6a43052036'

    const me = await whoAmI(userId, args.nosy, needleChatRoom.participants, db)
    if (!me) return 0

    let cursor = {
      chatRoomId: needleChatRoom._id,
      createdAt: { $gt: me.lastSeenAt },
    }
    if (me.role === '医助') {
      cursor = {
        ...cursor,
        $or: [
          { sourceType: { $exists: false } },
          {
            sourceType: { $in: ['FROM_CDE', 'FROM_PATIENT', 'SMS', 'WECHAT'] },
          },
          { messagesPatientReplyFlag: { $exists: true } },
        ],
      }
    }
    return await db.collection('needleChatMessages').count(cursor)
  },
  async lastSeenAt(needleChatRoom, args, context) {
    const userId = args.userId || '66728d10dc75bc6a43052036'
    const me = await whoAmI(userId, args.nosy, needleChatRoom.participants, db)
    return me && me.lastSeenAt
  },
  async patient(chatroom, _, { getDb }) {
    const patient = chatroom.participants.find(user => {
      return user.role === '患者'
    })
    if (!patient) return

    const db = await getDb()
    return await db
      .collection('users')
      .findOne({ _id: ObjectId(patient.userId) })
  },
}
