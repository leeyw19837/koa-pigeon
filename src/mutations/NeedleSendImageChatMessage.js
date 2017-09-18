import freshId from 'fresh-id'
import { uploadBase64Img } from '../utils/ks3'

export const sendImageChatMessage = async (_, args, context) => {
  const db = await context.getDb()

  const { chatRoomId, base64EncodedImageData } = args
  const { userType, userId } = context.state

  // let user

  // if (userType === 'PATIENT') {
  //   user = await db.collection('patients').findOne({ _id: userId })
  // } else if (userType === 'HEALTH_CARE_PROFESSIONAL') {
  //   user = await db
  //     .collection('healthCareProfessionals')
  //     .findOne({ _id: userId })
  // } else {
  //   throw new Error('You have to log in before you can chat.')
  // }
  const chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (!chatRoom) {
    throw new Error('Can not find chat room')
  }

  const participantObject = chatRoom.participants.map(p => p.userId === userId)

  if (!participantObject) {
    throw new Error('You can not post to chat rooms you are not a member of')
  }
  const imageUrlKey = `${userId}${Date.now()}`
  const imageUrl = await uploadBase64Img(imageUrlKey, base64EncodedImageData)
  const newChatMessage = {
    _id: freshId(),
    messageType: 'IMAGE',
    imageUrl,
    sender: { userType, userId },
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
  }
  await db.collection('needleChatMessages').insertOne(newChatMessage)
  return newChatMessage
}
