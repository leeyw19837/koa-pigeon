import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import get from 'lodash/get'

export const chatMessageAdded = {
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatMessageAdded'),
    (payload, variables) => {
      const chatRoomId = get(payload, 'chatMessageAdded.chatRoomId')
      if (!variables.chatRoomId) return true
      return variables.chatRoomId === chatRoomId
    },
  ),
}
