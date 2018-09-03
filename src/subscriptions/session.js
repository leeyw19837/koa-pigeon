import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'

export const sessionDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('sessionDynamics'),
    async (payload, variables) => {
      return payload.chatRoomId === variables.chatRoomId
    },
  ),
}
