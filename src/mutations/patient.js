import { ObjectID } from 'mongodb'
import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'
import { changeUsername } from './changeUsername'
import moment from 'moment'
import { outpatientPlanCheckIn } from './outpatientPlan'
// import { Date } from "../utils";
import { uploadBase64Img } from '../utils/ks3'

export const updatePatientProfile = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, profile } = args

  const { username, ...restSetter } = profile
  if (!isEmpty(restSetter)) {
    if (restSetter.nickname) {
      restSetter.pinyinName = getPinyinUsername(restSetter.nickname)
    }
    if (!isEmpty(restSetter.petname)) {
      const petnameDistinct = await db.collection('users').find({
        petname: restSetter.petname
      }).toArray()
      if (petnameDistinct && petnameDistinct.length > 0) {
        throw new Error('该昵称已被其他用户使用！')
      }
    }
    await db.collection('users').update(
      { _id: ObjectID(patientId) },
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

// archiveApplyStatus
export const updateUserArchiveState = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, reapplyStatus } = args
  await db
    .collection('users')
    .update({ _id: ObjectID(patientId) }, { $set: { reapplyStatus } })
  return true
}

export const updateUserIdentificationInfos = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, userIdentificationInfos } = args

  if (!patientId) {
    throw new Error('updateUserIdentificationInfos error! patientId 为空！')
  }

  const patient = await db
    .collection('users')
    .findOne({ _id: ObjectID(patientId) })
  if (!patient) {
    throw new Error(
      'updateUserIdentificationInfos error! patient does not exist!',
    )
  }

  const idCardDateOfBirth = userIdentificationInfos.idCard.substring(6, 14)
  const dateOfBirth = moment(idCardDateOfBirth, 'YYYYMMDD').toDate()
  const genderDigit = userIdentificationInfos.idCard.substr(-2, 1)
  await db.collection('users').update(
    { _id: ObjectID(patientId) },
    {
      $set: {
        ...userIdentificationInfos,
        dateOfBirth,
        gender: genderDigit % 2 === 0 ? 'female' : 'male',
      },
    },
  )

  return true
}

export const addWildPatient = async (
  _,
  { operatorId, patient, planId },
  context,
) => {
  const db = await context.getDb()
  const { username, idCard, nickname } = patient
  const isDuplicate = await db.collection('users').count({
    $or: [{ username }, { idCard }],
  })
  if (isDuplicate) throw new Error('No duplicate username or idCard allowed')
  const patientId = new ObjectID()

  const wildPatient = {
    _id: patientId,
    patientState: 'WILD',
    username,
    nickname,
    idCard,
    pinyinName: getPinyinUsername(nickname),
    createdAt: new Date(),
  }
  let plan
  if (patient.institutionId) {
    wildPatient.institutionId = patient.institutionId
  } else if (planId) {
    plan = await db
      .collection('outpatientPlan')
      .findOne({ _id: planId }, { hospitalId: 1, departmentId: 1, date: 1 })
    if (plan) wildPatient.institutionId = plan.hospitalId
  }
  if (operatorId) {
    wildPatient.createdBy = operatorId
  }
  const result = await db.collection('users').insert(wildPatient)
  if (plan) {
    const { hospitalId, departmentId } = plan
    await outpatientPlanCheckIn(
      null,
      { patientId: patientId.toString(), planId, hospitalId, departmentId },
      context,
    )
  }
  return result.result.ok
}
export const updateUserHeadImage = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, headImageBase64 } = args
  const imageUrlKey = `${patientId}${Date.now()}`
  const imageUrl = await uploadBase64Img(imageUrlKey, headImageBase64)
  await db.collection('users').update(
    { _id: ObjectId(patientId) },
    { $set: { avatar: imageUrl } }
  )
  return imageUrl
}

export const updateUserLocalCity = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, city } = args
  await db.collection('users').update(
    { _id: ObjectId(patientId) },
    { $set: { localCity: city } }
  )
  return true
}

