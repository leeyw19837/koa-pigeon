import { pubsub } from '../pubsub'

export const updateInterventionTaskState = async (_, args, { getDb }) => {
  const db = await getDb()

  const { _id, state } = args

  const task = await db.collection('interventionTask').findOne({ _id })
  if (task.type !== 'FOOD_CIRCLE') {
    throw new Error('only the food circle task could be ignore')
  }

  if (state !== task.state) {
    const result = await db.collection('interventionTask').update(
      {
        _id,
      },
      { $set: { state } },
    )
    const updateSucc = !!result.result.ok
    if (updateSucc) {
      pubsub.publish('interventionTaskDynamics', {
        ...task,
        state,
        _operation: 'UPDATED',
      })
    }
    return updateSucc
  }

  return true
}
