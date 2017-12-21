import freshId from 'fresh-id'
import { uploadBase64Img } from '../utils/ks3'
import { pubsub } from '../pubsub'

export const sendNeedleImageChatMessage = async (_, args, context) => {
  const db = await context.getDb()

  const { userId, chatRoomId, base64EncodedImageData } = args

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
    senderId: userId,
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
  }
  await db.collection('needleChatMessages').insertOne(newChatMessage)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })
  return newChatMessage
}
