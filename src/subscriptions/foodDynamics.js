import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'

export const foodDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('foodDynamics'),
    async (payload, variables) => {
      return payload.patientId === variables.patientId
    },
  ),
}
