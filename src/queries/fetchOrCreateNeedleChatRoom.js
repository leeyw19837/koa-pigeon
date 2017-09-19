import freshId from 'fresh-id'
import { uploadFile } from '../utils/ks3'
import { maybeCreateFromHexString } from '../utils'
import { ObjectId } from 'mongodb'

export const fetchOrCreateNeedleChatRoom = async (_, args, context) => {
  const db = await context.getDb()

  const { userId } = args

  const userObjectId = ObjectId.createFromHexString(userId)

  const user = await db.collection('users').findOne({
    _id: userId === '66728d10dc75bc6a43052036' ? userId : userObjectId,
  })

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
        { userId: '66728d10dc75bc6a43052036', lastSeenAt: new Date() },
        // TODO(tangweikun): Hard code(use yushuiqing's account)
      ],
    }
    await db.collection('needleChatRooms').insertOne(chatRoom)
    if (userId !== '66728d10dc75bc6a43052036') {
      await db
        .collection('users')
        .update(
          { _id: userObjectId },
          { $set: { needleChatRoomId: chatRoom._id } },
        )
    }
  }

  return chatRoom
}
