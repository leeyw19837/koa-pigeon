import { ObjectId } from 'mongodb'
import { sendTxt } from '../common'
import moment from 'moment'

export const handleReplySms = async (chatRoomId, patientParticipants) => {
  const patientId = patientParticipants.userId
  const userObjectId = ObjectId.createFromHexString(patientId)
  const patient = await db.collection('users').findOne({ _id: userObjectId })

  const condition = { chatRoomId: chatRoomId, senderId: patientId }
  const messageArray = await db
    .collection('needleChatMessages')
    .find(condition)
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray()
  //   console.log('=======isAssistant', messageArray[0])

  const sourceType = messageArray[0].sourceType

  if (sourceType === 'SMS' || sourceType === 'WECHAT') {
    if (
      !patient.sendMsgTimeAt ||
      moment().diff(patient.sendMsgTimeAt, 'days') > 7
    ) {
      //   console.log('++++++++++++++aaaaaaaa', patient.username)
      await sendTxt({
        mobile: patient.username,
        // mobile: '18612201226',
        templateId: 'SMS_150181050',
        params: {
          sourceType: sourceType === 'SMS' ? '短信' : '微信公众号',
        },
      })

      await db.collection('users').update(
        {
          _id: userObjectId,
        },
        {
          $set: {
            sendMsgTimeAt: new Date(),
          },
        },
      )
    }
  }
}
