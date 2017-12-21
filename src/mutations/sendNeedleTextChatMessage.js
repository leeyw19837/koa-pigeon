import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'

export const sendNeedleTextChatMessage = async (_, args, context) => {
  const db = await context.getDb()

  const { userId, chatRoomId, text } = args

  const userObjectId = ObjectId.createFromHexString(userId)

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

  const newChatMessage = {
    _id: freshId(),
    messageType: 'TEXT',
    text,
    senderId: userId,
    createdAt: new Date(),
    chatRoomId: chatRoom._id,
  }

  await db.collection('needleChatMessages').insertOne(newChatMessage)
  pubsub.publish('chatMessageAdded', { chatMessageAdded: newChatMessage })

  chatRoom.participants.map(async p => {
    if(p.userId !== userId){
      const user = await db.collection('users').findOne({ _id: ObjectID.createFromHexString(p.userId) })
      if(!user.roles){
        pushChatNotification({
          patient:user,
          messageType:'TEXT',
          text,
          db,
        })
      }
    }
  })

  return newChatMessage
}
