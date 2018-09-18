import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'

export const foodDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('foodDynamics'),
    async (payload, variables) => {
      // console.log('-subscribe-',payload,'||',variables)
      // console.log('pp',payload.patientId === variables.patientId && (!variables.client  ? payload._senderRole : true))
      const isFromApp = !variables.client
      const isSendByPro = !!payload._senderRole
      // console.log('----------,,,,', isFromApp, isSendByPro)
      return payload.patientId === variables.patientId && (isFromApp  ? isSendByPro : true)
    },
  ),
}
