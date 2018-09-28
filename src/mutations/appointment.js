import freshId from 'fresh-id'
import {ObjectID} from "mongodb";
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
    note
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
      _id: ObjectID.createFromHexString(patientId)
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
    quantizationAt
  } = params
  const $setObj = {
    hisNumber,
    blood,
    footAt,
    eyeGroundAt,
    insulinAt,
    nutritionAt,
    healthTech,
    quantizationAt
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
  await db.collection('appointments').deleteOne(
    {
      patientId,
    },
  )
  await db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId)
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
  const {
    institutionId,
    nickname,
    source,
    mobile,
  } = params

  const existedUser = await db.collection('users').findOne({username: {$regex: mobile}})
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
      _id:patientId,
      nickname,
      username,
      createdAt:new Date(),
      source,
      patientState:'NEEDS_APPOINTMENT',
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
  await db.collection('appointments').insert({...params, patientId: patientId.toString()})
  context.response.set('effect-types', 'PatientList,PatientDetail')
  return true
}

