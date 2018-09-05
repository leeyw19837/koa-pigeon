import { categories } from '../modules/AI'

export const queryAIContentTypes = async () => {
  return await categories()
}
