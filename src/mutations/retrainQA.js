import { modelRetrain } from '../modules/AI'

export const retrainQA = async (_, args, context) => {
  const { q, a } = args
  console.log(`retrain qa result is ${await modelRetrain(q, a)}`)
  return true
}
