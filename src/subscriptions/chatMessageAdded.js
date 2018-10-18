import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import get from 'lodash/get'

export const chatMessageAdded = {
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatMessageAdded'),
    (payload, variables) => {
      const chatRoomId = get(payload, 'chatMessageAdded.chatRoomId')
      const messageType = get(payload, 'chatMessageAdded.messageType')
      const client = get(variables, 'client')
      if (messageType === 'BUBBLE' && client !== 'WEB') {
        return false
      } else {
        if (!variables.chatRoomId) {
          return true
        } else {
          return variables.chatRoomId === chatRoomId
        }
      }
    },
  ),
}

export const chatMessageUpdated = {
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatMessageUpdated'),
    (payload, variables) => {
      const chatRoomId = get(payload, 'chatMessageUpdated.chatRoomId')

      // const client = get(variables, 'client')

      if (!variables.chatRoomId) {
        return true
      } else {
        return variables.chatRoomId === chatRoomId
      }
    },
  ),
}
