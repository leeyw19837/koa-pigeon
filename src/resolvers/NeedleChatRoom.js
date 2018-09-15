import { first } from 'lodash'
import { maybeCreateFromHexString } from '../utils'
import { ObjectId } from 'mongodb'
import { whoAmI } from '../modules/chat'
import { qa } from '../modules/AI'

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

    // query AI QA
    const patientLatestMsg = messages.filter(msg => {
      return msg.sourceType === 'FROM_PATIENT' && msg.messageType === 'TEXT'
    })

    for (
      let i = 0, len = patientLatestMsg.length;
      i < (len > 5 ? 5 : len);
      i++
    ) {
      patientLatestMsg[i].intelligentQA = await qa(patientLatestMsg[i].text)
    }
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

    return me.unreadCount || 0
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
  async responder({ _id }, _, { getDb }) {
    const db = await getDb()
    let processingSession = await db
      .collection('sessions')
      .find({
        chatRoomId: _id,
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    processingSession = first(processingSession)
    const educatorId =
      processingSession &&
      !processingSession.endAt &&
      processingSession.educatorId
    if (educatorId) {
      return {
        _id: processingSession.educatorId,
        nickname: processingSession.educatorName,
      }
    }
  },
}
