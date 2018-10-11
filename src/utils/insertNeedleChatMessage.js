import get from 'lodash/get'
import { sendNeedleBubbleChatMessage } from '../mutations/sendNeedleBubbleChatMessage'

export const insertChat = async (_, args, context) => {
  const { patientId, textContent, sourceType, taskId, taskType } = args
  const db = await context.getDb()
  const chatRoom = await db
    .collection('needleChatRooms')
    .findOne({ 'participants.userId': patientId })
  const chatRoomId = get(chatRoom, '_id')

  const sendArgs = {
    userId: patientId,
    chatRoomId,
    text: textContent,
    sourceType,
    taskId,
    taskType,
    messageType: 'BUBBLE',
  }
  const updateResult = await sendNeedleBubbleChatMessage(_, sendArgs, context)
  return !!updateResult
}
