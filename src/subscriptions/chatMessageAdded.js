import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
const get = require('lodash/get')

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
