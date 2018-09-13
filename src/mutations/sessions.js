import { pubsub } from '../pubsub'
import { finishSession as finish } from '../modules/chat'

export const finishSession = async (_, { chatRoomId }, { getDb }) => {
  const db = await getDb()
  await finish(db, chatRoomId, 'manually')
  return true
}
