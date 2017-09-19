import freshId from 'fresh-id'
import { uploadFile } from '../utils/ks3'
import { ObjectId } from 'mongodb'

export const fetchOrCreateNeedleChatRoom = async (_, args, context) => {
  const db = await context.getDb()

  const { userId } = args

  const userObjectId = ObjectId.createFromHexString(userId)

  const user = await db.collection('users').findOne({ _id: userObjectId })

  let chatRoom
  if (user.needleChatRoomId) {
    chatRoom = await db
      .collection('needleChatRooms')
      .findOne({ _id: user.needleChatRoomId })
  } else {
    chatRoom = {
      _id: freshId(),
      participants: [
        { userId, lastSeenAt: new Date() },
        // TODO(jan): Add doctor to chat room
      ],
    }
    await db.collection('needleChatRooms').insertOne(chatRoom)
    await db
      .collection('users')
      .update(
        { _id: userObjectId },
        { $set: { needleChatRoomId: chatRoom._id } },
      )
  }

  return chatRoom
}
