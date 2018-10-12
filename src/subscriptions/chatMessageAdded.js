import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import get from 'lodash/get'

export const chatMessageAdded = {
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatMessageAdded'),
    (payload, variables) => {
      console.log('payload = ',payload,'variables = ',variables)
      const chatRoomId = get(payload, 'chatMessageAdded.chatRoomId')
      const messageType = get(payload, 'chatMessageAdded.messageType')
      const client = get(variables, 'client')
      console.log('client',client)
      if (messageType === 'BUBBLE' && client !== 'WEB'){
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
