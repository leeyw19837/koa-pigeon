import freshId from 'fresh-id'
import { pubsub } from '../pubsub'

export const saveTaskSoap = async (_, args, context) => {
  const db = await context.getDb()
  const { _id, soap } = args
  if (_id) {
    await db.collection('taskSoap').update(
      { _id },
      {
        ...soap,
        updatedAt: new Date(),
      },
    )
  } else {
    await db.collection('taskSoap').insertOne({
      _id: freshId(),
      ...soap,
      updatedAt: new Date(),
      createdAt: new Date(),
    })

    await db.collection('interventionTask').update(
      {
        _id: soap.taskId,
      },
      {
        $set: { state: 'DONE' },
      },
    )
    const task = await db
      .collection('interventionTask')
      .findOne({ _id: soap.taskId })
    pubsub.publish('interventionTaskDynamics', {
      ...task,
      _operation: 'UPDATED',
    })
  }

  return true
}
