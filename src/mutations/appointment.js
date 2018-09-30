import freshId from 'fresh-id'
import { ObjectID } from 'mongodb'
const moment = require('moment')

export const addAppointment = async (_, args, context) => {
  context.response.set('effect-types', 'Appointment,DailyAppointment')
  return true
}

export const updateAppointmentInfos = async (_, params, context) => {
  const { patientId, nickname, mobile, source, expectedTime, note } = params
  const $setObj = {
    nickname,
    mobile,
    source,
    expectedTime,
    note,
  }
  await db.collection('appointments').update(
    {
      patientId,
    },
    {
      $set: $setObj,
    },
  )
  await db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId),
    },
    {
      $set: {
        nickname,
        username: mobile,
        source,
        updatedAt: new Date(),
      },
    },
  )
  return true
}

export const updateAppointmentDetailInfos = async (_, params, context) => {
  const {
    patientId,
    hisNumber,
    blood,
    footAt,
    eyeGroundAt,
    insulinAt,
    nutritionAt,
    healthTech,
    quantizationAt,
  } = params
  const $setObj = {
    hisNumber,
    blood,
    footAt,
    eyeGroundAt,
    insulinAt,
    nutritionAt,
    healthTech,
    quantizationAt,
  }
  await db.collection('appointments').update(
    {
      patientId,
    },
    {
      $set: $setObj,
    },
  )
  return true
}

export const deletePatientAppointment = async (_, params, context) => {
  const { patientId } = params
  await db.collection('appointments').deleteOne({
    patientId,
  })
  await db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId),
    },
    {
      $set: {
        patientState: 'REMOVED',
        updatedAt: new Date(),
      },
    },
  )
  return true
}

export const addPatientAppointment = async (_, params, context) => {
  // console.log('addPatientAppointment',params)
  const { institutionId, nickname, source, mobile } = params

  const existedUser = await db
    .collection('users')
    .findOne({ username: { $regex: mobile } })
  const isExisted = !!existedUser
  if (
    isExisted &&
    ['POTENTIAL', 'REMOVED'].indexOf(existedUser.patientState) === -1
  ) {
    return { mobile: 'duplicate' }
  }

  const username = mobile
  const currentUser = existedUser
  let patientId
  if (!currentUser) {
    patientId = new ObjectID()
    await db.collection('users').insert({
      _id: patientId,
      nickname,
      username,
      createdAt: new Date(),
      source,
      patientState: 'NEEDS_APPOINTMENT',
    })
  } else if (
    currentUser.patientState === 'POTENTIAL' ||
    currentUser.patientState === 'REMOVED'
  ) {
    patientId = currentUser._id
    await db.collection('users').update(
      {
        _id: currentUser._id,
      },
      {
        $set: {
          nickname,
          source,
          patientState: 'NEEDS_APPOINTMENT',
          institutionId,
          updatedAt: new Date(),
        },
      },
    )
  }
  await db
    .collection('appointments')
    .insert({ ...params, patientId: patientId.toString() })
  context.response.set('effect-types', 'PatientList,PatientDetail')
  return true
}

const syncInfo = async ({ patientId, key, value }) => {
  if (value === '') return
  const setKey = key === 'mobile' ? 'username' : key
  const $setObj = {
    [setKey]: value,
    updatedAt: new Date(),
  }
  await db
    .collection('appointments')
    .update({ patientId }, { $set: $setObj }, { multi: true })
  await db
    .collection('treatmentState')
    .update({ patientId }, { $set: $setObj }, { multi: true })

  await db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId),
    },
    { $set: $setObj },
  )
}

const syncMobile = async ({ patientId, mobile }) => {}

export const updateAppointmentById = async (_, { appointment }, context) => {
  const { _id, patientId, nickname, mobile } = appointment
  const dbAppointment = await db.collection('appointments').findOne({ _id })
  if (!dbAppointment) {
    throw new Error('Appointment _id is not existed!')
  }
  if (appointment.nickname !== dbAppointment.nickname) {
    await syncInfo({
      patientId,
      key: 'nickname',
      value: nickname,
    })
  }
  if (appointment.mobile !== dbAppointment.mobile) {
    const user = await db.collection('users').findOne({ username: mobile })
    if (user) {
      return 'duplicate'
    }
    await syncInfo({
      patientId,
      key: 'mobile',
      value: mobile,
    })
  }
  const { treatmentStateId } = dbAppointment
  await db.collection('appointments').update(
    {
      _id,
    },
    {
      $set: {
        ...appointment,
        updatedAt: new Date(),
      },
    },
  )

  const syncToTreatments = ['note', 'hisNumber', 'source']
  const checkItems = [
    'blood',
    'footAt',
    'eyeGroundAt',
    'insulinAt',
    'nutritionAt',
    'healthTech',
    'quantizationAt',
  ]
  const treatmentObj = {}
  checkItems.forEach(o => {
    treatmentObj[o] = appointment[o] ? false : null
  })
  syncToTreatments.forEach(o => {
    treatmentObj[o] = appointment[o]
  })
  await db.collection('treatmentState').update(
    {
      _id: treatmentStateId,
    },
    {
      $set: {
        ...treatmentObj,
        updatedAt: new Date(),
      },
    },
  )
  return ''
}
