import { pubsub } from '../pubsub'

export const chatMessageAdded = {
  subscribe: () => pubsub.asyncIterator('chatMessageAdded'),
}
