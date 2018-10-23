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
  if (profile.nickname) {
    await db
      .collection('appointments')
      .update({ patientId }, { $set: { nickname: profile.nickname } })
    await db
      .collection('treatmentState')
      .update({ patientId }, { $set: { nickname: profile.nickname } })
  }

  if (username) {
    const succ = await changeUsername(
      _,
      { patientId, newUsername: username },
      context,
    )
    if (!succ) {
      throw new Error('手机号已被其他用户使用！')
    }
  }

  return true
}
