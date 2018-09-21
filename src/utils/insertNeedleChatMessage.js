import get from 'lodash/get'
import { sendNeedleTaskChatMessage } from '../mutations/sendNeedleTaskChatMessage'

export const insertChat = async (_, args, context) => {
  const { patientId, textContent, sourceType, taskId, taskType, desc } = args
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
    desc,
    messageType: 'TASK',
  }
  const updateResult = await sendNeedleTaskChatMessage(_, sendArgs, context)
  return !!updateResult
}
