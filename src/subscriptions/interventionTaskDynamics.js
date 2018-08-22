import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import { ObjectID } from 'mongodb'

export const interventionTaskDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('interventionTaskDynamics'),
    async (payload, variables) => {
      const patient = await global.db
        .collection('users')
        .findOne({ _id: ObjectID(payload.patientId) })
      return (
        variables.nosy ||
        (patient &&
          (patient.cdeId === variables.cdeId ||
            patient._id.toString() === variables.patientId))
      )
    },
  ),
}
