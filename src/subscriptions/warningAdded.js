import { pubsub } from '../pubsub'

export const warningAdded = {
  subscribe: () => pubsub.asyncIterator('warningAdded'),
}
