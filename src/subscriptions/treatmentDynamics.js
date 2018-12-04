import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import { ObjectID } from 'mongodb'

export const treatmentDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('treatmentDynamics'),
    async (payload, variables) => {
      const outpatient = await global.db
        .collection('outpatients')
        .findOne({ _id: variables.outpatientId })
      const { appointmentsId } = outpatient || { appointmentsId: [] }
      const appointments = await global.db
        .collection('appointments')
        .find({
          _id: { $in: appointmentsId },
          patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
        })
        .toArray()
      const treatmentIds = appointments.map(o => o.treatmentStateId)
      return treatmentIds.indexOf(payload._id) !== -1
    },
  ),
}
