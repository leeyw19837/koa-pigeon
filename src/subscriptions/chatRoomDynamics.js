import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import { whoAmI } from '../modules/chat'

export const chatRoomDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatRoomDynamics'),
    async (payload, variables, ctx) => {
      const { userId, nosy, chatRoomId } = variables
      if (chatRoomId) {
        return payload._id === chatRoomId
      }
      const me = await whoAmI(
        userId,
        nosy,
        payload.participants,
        await ctx.getDb(),
      )
      return !!me
    },
  ),
}
