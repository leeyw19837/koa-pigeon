import { ObjectId } from 'mongodb'
import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'
import { changeUsername } from './changeUsername'

export const updatePatientProfile = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, profile } = args

  const { username, ...restSetter } = profile
  if (!isEmpty(restSetter)) {
    if (restSetter.nickname) {
      restSetter.pinyinName = getPinyinUsername(restSetter.nickname)
    }
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

const getPinyinUsername = name => {
  const clearName = name.trim()
  const pinyinFull = PinyinHelper.convertToPinyinString(
    clearName,
    '',
    PinyinFormat.WITHOUT_TONE,
  )
  let initial = pinyinFull[0]
  if (!/[A-Za-z]/.test(initial)) {
    initial = '~'
  }
  const pinyin = {
    full: pinyinFull,
    short: PinyinHelper.convertToPinyinString(
      clearName,
      '',
      PinyinFormat.FIRST_LETTER,
    ),
    initial,
  }
  return pinyin
}
