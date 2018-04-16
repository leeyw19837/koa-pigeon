import get from 'lodash/get'
import { ObjectID } from 'mongodb'

export const updateUserDevices = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, deviceContext = {} } = args

  if (!patientId) {
    throw new Error('You must be logged in to update devices')
  }
  const user = await db
    .collection('users')
    .findOne({ _id: ObjectID.createFromHexString(patientId) })
  if (!user) {
    throw new Error("You don't exist")
  }

  await db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId),
    },
    {
      $set: {
        deviceContext,
      },
    },
  )
  return true
}
