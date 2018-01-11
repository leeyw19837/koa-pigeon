import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
const find = require('lodash/find')

export const chatRoomDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('chatRoomDynamics'),
    (payload, variables) => {
      return (
        payload &&
        !!find(payload.participants, {
          userId: variables.userId,
        })
      )
    }
  ),
}
