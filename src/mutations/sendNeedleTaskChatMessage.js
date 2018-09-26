import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'
import { sessionFeeder } from '../modules/chat'

export const sendNeedleTaskChatMessage = async (_, args, { getDb }) => {
  const db = getDb === undefined ? global.db : await getDb()

  const {
    userId,
    chatRoomId,
    text,
    sourceType,
    taskType,
    taskId,
    desc,
  } = args

  let chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ _id: chatRoomId })

  if (!chatRoom) {
    throw new Error('Can not find chat room')
  }

  const newChatMessage = {
    _id: freshId(),
    messageType: 'TASK',
    text,
    senderId: '66728d10dc75bc6a43052036',
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
    sourceType,
    taskType,
    taskId,
    desc,
  }

  await db.collection('needleChatMessages').insertOne(newChatMessage)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  chatRoom = await db.collection('needleChatRooms').findOne({ _id: chatRoomId })
  pubsub.publish('chatRoomDynamics', chatRoom)
  return newChatMessage
}
