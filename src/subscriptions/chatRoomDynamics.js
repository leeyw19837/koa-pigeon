import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
const find = require('lodash/find')

export const chatRoomDynamics = {
  resolve: (payload, variables) => {
    console.log(payload, variables, '====')
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatRoomDynamics'),
    (payload, variables) => {
      return !!find(payload.participants, {
        userId: variables.userId,
      })
    }
  ),
}
