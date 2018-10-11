import freshId from 'fresh-id'
import { pubsub } from '../pubsub'

export const sendNeedleBubbleChatMessage = async (_, args, { getDb }) => {
  const db = getDb === undefined ? global.db : await getDb()

  const {
    chatRoomId,
    text,
    sourceType,
    taskType,
    taskId,
  } = args

  let chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (!chatRoom) {
    throw new Error('Can not find chat room')
  }

  const newChatMessage = {
    _id: freshId(),
    messageType: 'BUBBLE',
    text,
    senderId: '66728d10dc75bc6a43052036',
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
    sourceType,
    taskType,
    taskId,
  }

  await db.collection('needleChatMessages').insertOne(newChatMessage)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  chatRoom = await db.collection('needleChatRooms').findOne({ _id: chatRoomId })
  pubsub.publish('chatRoomDynamics', chatRoom)
  return newChatMessage
}
