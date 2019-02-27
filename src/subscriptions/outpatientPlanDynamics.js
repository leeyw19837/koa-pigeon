import { pubsub } from '../pubsub'
import { withFilter } from 'graphql-subscriptions'
import dayjs from 'dayjs'

export const outpatientPlanDynamics = {
  resolve: payload => {
    return payload
  },
  subscribe: withFilter(
    () => pubsub.asyncIterator('outpatientPlanDynamics'),
    async (payload, variables, ctx) => {
      const { date, id } = variables
      if (date) {
        const firstDay = dayjs(date)
          .startOf('month')
          .subtract(6, 'day')
          .format('YYYY-MM-DD')
        const lastDay = dayjs(date)
          .endOf('month')
          .add(13, 'day')
          .format('YYYY-MM-DD')
        return payload.date >= firstDay && payload.date < lastDay
      }
      if (id) {
        return payload._id === id
      }
    },
  ),
}
