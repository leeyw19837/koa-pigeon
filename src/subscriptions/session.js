import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import { whoAmI } from '../modules/chat'

export const sessionDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('sessionDynamics'),
    async (payload, variables, ctx) => {
      const { userId, nosy, chatRoomId } = variables
      if (chatRoomId) {
        return payload.chatRoomId === chatRoomId
      }
      const chatRoom = await db
        .collection('needleChatRooms')
        .findOne({ _id: payload.chatRoomId })
      const me = await whoAmI(
        userId,
        nosy,
        chatRoom.participants,
        await ctx.getDb(),
      )
      return !!me
    },
  ),
}
