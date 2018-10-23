import { ObjectId } from 'mongodb'
import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'
import { changeUsername } from './changeUsername'

export const updatePatientProfile = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, profile } = args

  const { username, ...restSetter } = profile
  if (!isEmpty(profile)) {
    await db.collection('users').update(
      { _id: ObjectId(patientId) },
      {
        $set: restSetter,
      },
    )
  }

  if (username) {
    await changeUsername(_, { patientId, newUsername: username }, context)
  }

  if (profile.nickname) {
    await db
      .collection('appointments')
      .update({ patientId }, { $set: { nickname: profile.nickname } })
    await db
      .collection('treatmentState')
      .update({ patientId }, { $set: { nickname: profile.nickname } })
  }
  return true
}
