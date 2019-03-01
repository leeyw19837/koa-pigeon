import freshId from 'fresh-id'
import dayjs from 'dayjs'
import find from 'lodash/find'
import union from 'lodash/union'
import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'
import findIndex from 'lodash/findIndex'
import pick from 'lodash/pick'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import { ObjectID } from 'mongodb'

import { pubsub } from '../pubsub'

import { mutateTreatmentCheckboxs } from './treatmentState'
import { addPatientAppointment } from './appointment'

const WEEKDAYS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
const isSameWeek = (date1, date2) => {
  const startOfThisWeek = dayjs(date1)
    .startOf('week')
    .add(1, 'day')
    .format('YYYY-MM-DD')
  const endOfThisWeek = dayjs(date1)
    .endOf('week')
    .add(1, 'day')
    .format('YYYY-MM-DD')
  return date2 >= startOfThisWeek && date2 <= endOfThisWeek
}
export const movePatientToOutpatientPlan = async (_, args, context) => {
  const db = await context.getDb()

  const { patientId, toPlan, fromPlanId, disease, doctorName } = args
  console.log('jjjjjjjj', patientId, toPlan)
  const startOfThisWeek = dayjs()
    .startOf('week')
    .add(1, 'day')
    .format('YYYY-MM-DD')
  const endOfThisWeek = dayjs()
    .endOf('week')
    .add(1, 'day')
    .format('YYYY-MM-DD')
  const { hospitalId, departmentId, date } = toPlan
  let existsPlanGroup = await db.collection('outpatientPlanGroup').findOne({
    hospitalId,
    departmentId,
    'period.startDate': { $lte: date },
    'period.endDate': { $gte: date },
  })
  if (!existsPlanGroup) {
    await db.collection('outpatientPlanGroup').insert({
      _id: freshId(),
      hospitalId,
      departmentId,
      period: {
        startDate: startOfThisWeek,
        endDate: endOfThisWeek,
      },
      patientIds: [patientId],
      createdAt: new Date(),
    })
    existsPlanGroup = await db.collection('outpatientPlanGroup').findOne({
      hospitalId,
      departmentId,
      'period.startDate': { $lte: date },
      'period.endDate': { $gte: date },
    })
  } else {
    await db.collection('outpatientPlanGroup').update(
      {
        _id: existsPlanGroup._id,
      },
      { $addToSet: { patientIds: patientId } },
      { $set: { updatedAt: new Date() } },
    )
  }

  const existsPlan = await db.collection('outpatientPlan').findOne(toPlan)

  let result
  if (!existsPlan) {
    const extraData = {
      patientId: patientId,
      disease: disease,
      doctor: doctorName,
    }
    const planObj = {
      _id: new ObjectID().toString(),
      groupId: existsPlanGroup._id,
      hospitalId,
      departmentId,
      date,
      dayOfWeek: WEEKDAYS[dayjs(date).day()],
      signedIds: [],
      createdAt: new Date(),
      extraData: [extraData],
    }
    result = await db.collection('outpatientPlan').insert(planObj)
    result.result.ok &&
      pubsub.publish('outpatientPlanDynamics', {
        ...planObj,
        _operation: 'ADDED',
      })
  } else {
    const index = findIndex(existsPlan.extraData, { patientId })
    const extraPart = pick(args, ['nextVisitDate', 'disease', 'mobile'])

    let setter
    if (!isEmpty(extraPart)) {
      extraPart.patientId = patientId
      extraPart.doctor = doctorName
      if (index < 0) {
        setter = {
          $push: { extraData: extraPart },
          $set: { updatedAt: new Date() },
        }
      } else {
        const extraData = [...existsPlan.extraData]
        extraData[index] = { ...extraData[index], ...extraPart }
        setter = {
          $set: { extraData, updatedAt: new Date() },
        }
      }
    }

    result = await db
      .collection('outpatientPlan')
      .update({ _id: existsPlan._id }, setter)

    result &&
      result.result.ok &&
      pubsub.publish('outpatientPlanDynamics', {
        ...existsPlan,
        patientIds: union(existsPlan.patientIds, [patientId]),
        _operation: 'UPDATED',
      })
  }

  if (!isEmpty(disease)) {
    await db
      .collection('users')
      .update({ _id: ObjectID(patientId) }, { $set: { disease } })
  }
  if (fromPlanId && result.result.ok) {
    result = await db.collection('outpatientPlan').update(
      { _id: fromPlanId },
      {
        $push: { extraData: { patientId, nextVisitDate: toPlan.date } },
        $set: { updatedAt: new Date() },
      },
    )
    if (result.result.ok) {
      const updatedPlan = await db
        .collection('outpatientPlan')
        .findOne({ _id: fromPlanId })
      updatedPlan &&
        pubsub.publish('outpatientPlanDynamics', {
          ...updatedPlan,
          _operation: 'UPDATED',
        })
    }
  }
  return get(result, 'result.ok', true)
}
const MessageMap = [
  {
    code: 'PLANID_NOT_FOUND',
    type: 'FAIL',
    message: {
      type: 'ERROR',
      text: '没有对应的门诊信息',
    },
  },
  {
    code: 'NO_PLAN_FOR_DEPARTMENT',
    type: 'FAIL',
    message: {
      type: 'ERROR',
      text: '今日无门诊',
    },
  },
  {
    code: 'NO_PARAMS',
    type: 'FAIL',
    message: {
      type: 'ERROR',
      text: '参数错误',
    },
  },
  {
    code: 'ONLY_CHECKIN_AT_THAT_DAY',
    type: 'FAIL',
    message: {
      type: 'ERROR',
      text: '只能在当天签到',
    },
  },
  {
    code: 'NOT_PLAN_PATIENT',
    type: 'SUCCESS',
    message: {
      type: 'WARNING',
      text: '今日门诊计划无此患者',
    },
  },
  {
    code: 'CHECKIN',
    type: 'SUCCESS',
    message: {
      type: 'SUCCESS',
      text: '签到成功',
    },
  },
  {
    code: 'ALREADY_SIGNED',
    type: 'SUCCESS',
    message: {
      type: 'SUCCESS',
      text: '签到成功',
    },
  },
  {
    code: 'FAILED',
    type: 'FAIL',
    message: {
      type: 'ERROR',
      text: '签到失败',
    },
  },
  {
    code: 'NO_TREATMENT_TODAY_FOR_YOU',
    type: 'FAIL',
    message: {
      type: 'ERROR',
      text: '患者今日无共同照护门诊',
    },
  },
]
const getReturnMessage = code => {
  return (
    find(MessageMap, { code }) || {
      type: 'UNKNOWN',
      code: 'UNKNOWN',
      message: {
        type: 'ERROR',
        text: '未知错误',
      },
    }
  )
}

export const outpatientPlanCheckIn = async (
  _,
  { patientId, planId, hospitalId, departmentId, noHealthCare = false },
  context,
) => {
  const db = await context.getDb()
  if (!noHealthCare) {
    let gtzhCheckInState
    const patient = await db.collection('users').findOne({
      _id: ObjectID(patientId),
      patientState: { $in: ['ACTIVE', 'HAS_APPOINTMENT'] },
    })
    if (patient) {
      const treatmentToday = await db.collection('appointments').findOne({
        patientId,
        patientState: { $ne: 'ARCHIVED' },
        appointmentTime: {
          $gte: dayjs()
            .startOf('day')
            .toDate(),
          $lt: dayjs()
            .endOf('day')
            .toDate(),
        },
      })
      if (!treatmentToday) {
        return getReturnMessage('NO_TREATMENT_TODAY_FOR_YOU')
      } else if (treatmentToday.checkIn) {
        return getReturnMessage('ALREADY_SIGNED')
      } else {
        const appointmentId = treatmentToday.appointmentId
        const outpatient = await db
          .collection('outpatients')
          .findOne({ appointmentsId: { $eq: appointmentId, $ne: null } })
        if (outpatient) {
          gtzhCheckInState = await mutateTreatmentCheckboxs(
            null,
            {
              propName: 'checkIn',
              propValue: true,
              treatmentId: treatmentToday._id,
              outpatientId: outpatient._id,
            },
            context,
          )
          if (gtzhCheckInState.status !== 'success') {
            return getReturnMessage('FAILED')
          }
        }
      }
    }
  }

  let cond
  let returnCode
  const dateStr = dayjs().format('YYYY-MM-DD')
  if (planId) {
    cond = { _id: planId }
    returnCode = 'PLANID_NOT_FOUND'
  } else if (hospitalId && departmentId) {
    cond = { hospitalId, departmentId, date: dateStr }
    returnCode = 'NO_PLAN_FOR_DEPARTMENT'
  } else {
    return getReturnMessage('NO_PARAMS')
  }
  // let existsPlan = await db.collection('outpatientPlan').findOne(cond)
  // if (!existsPlan || !includes( existsPlan.patientIds, patientId)) {
  await movePatientToOutpatientPlan(
    null,
    { patientId, toPlan: { date: dateStr, hospitalId, departmentId } },
    context,
  )
  const existsPlan = await db.collection('outpatientPlan').findOne(cond)

  if (!isSameWeek(dateStr, existsPlan.date))
    return getReturnMessage('ONLY_CHECKIN_AT_THAT_DAY')

  if (includes(existsPlan.signedIds, patientId)) {
    return getReturnMessage('ALREADY_SIGNED')
  }

  returnCode = 'CHECKIN'

  const patientExtraIndex = findIndex(existsPlan.extraData, { patientId })
  const newExtraData = isEmpty(existsPlan.extraData)
    ? []
    : [...existsPlan.extraData]
  newExtraData[patientExtraIndex] =
    patientExtraIndex > 0
      ? { ...newExtraData[patientExtraIndex], signedAt: new Date() }
      : { patientId, signedAt: new Date() }

  const result = await db.collection('outpatientPlan').update(
    { _id: existsPlan._id },
    {
      $addToSet: { signedIds: patientId },
      $set: { extraData: newExtraData },
    },
  )
  if (result.result.ok) {
    const updatedPlan = await db
      .collection('outpatientPlan')
      .findOne({ _id: existsPlan._id })
    pubsub.publish('outpatientPlanDynamics', {
      ...updatedPlan,
      _operation: 'UPDATED',
    })
  }
  if (result.result.ok) {
    return getReturnMessage(returnCode)
  }
  return getReturnMessage('FAILED')
}

export const cancelCheckIn = async (_, { patientId, planId }, context) => {
  const db = await context.getDb()
  const existsPlan = await db
    .collection('outpatientPlan')
    .findOne({ _id: planId })
  if (!existsPlan) return false

  const isSameDay = dayjs().format('YYYY-MM-DD') === existsPlan.date
  if (!isSameDay) throw new Error('cannot cancel a non-preset check-in')

  const extraData = filter(existsPlan.extraData, { patientId })
  const result = await db
    .collection('outpatientPlan')
    .update(
      { _id: planId },
      { $pull: { signedIds: patientId }, $set: { extraData } },
    )

  if (result.result.ok) {
    const updatedPlan = await db
      .collection('outpatientPlan')
      .findOne({ _id: planId })
    pubsub.publish('outpatientPlanDynamics', {
      ...updatedPlan,
      _operation: 'UPDATED',
    })
  }
  return result.result.ok
}

export const changeWildPatientInfos = async (
  _,
  { operatorId, planId, patient },
  { getDb },
) => {
  const db = await getDb()

  const existsPlan = await db
    .collection('outpatientPlan')
    .findOne({ _id: planId })
  if (existsPlan) {
    const index = findIndex(existsPlan.extraData, { patientId: patient._id })
    const extraPart = pick(patient, ['nextVisitDate', 'disease', 'username'])
    if (!isEmpty(extraPart)) {
      extraPart.patientId = patient._id
      let setter
      if (index < 0) {
        setter = {
          $push: { extraData: extraPart },
          $set: { updatedBy: operatorId, updatedAt: new Date() },
        }
      } else {
        const extraData = [...existsPlan.extraData]
        extraData[index] = { ...extraData[index], ...extraPart }
        setter = {
          $set: { extraData, updatedBy: operatorId, updatedAt: new Date() },
        }
      }
      await db
        .collection('outpatientPlan')
        .update({ _id: existsPlan._id }, setter)
    }
  }
  const patientFields = pick(patient, [
    'username',
    'nickname',
    'idCard',
    'avatar',
    'status',
    'disease',
    'nextVisitDate',
  ])
  await db.collection('users').update(
    { _id: ObjectID(patient._id) },
    {
      $set: {
        ...patientFields,
        updatedBy: operatorId,
        updatedAt: new Date(),
      },
    },
  )

  if (existsPlan) {
    const updatedPlan = await db
      .collection('outpatientPlan')
      .findOne({ _id: existsPlan._id })
    pubsub.publish('outpatientPlanDynamics', {
      ...updatedPlan,
      _operation: 'UPDATED',
    })
  }
  return true
}

export const transformToHealthCarePatient = async (_, args, context) => {
  const { planId, ...rest } = args
  const result = await addPatientAppointment(null, rest, context)
  if (result) {
    const updatedPlan = await db
      .collection('outpatientPlan')
      .findOne({ _id: planId })
    pubsub.publish('outpatientPlanDynamics', {
      ...updatedPlan,
      _operation: 'UPDATED',
    })
  }
  return !!result
}
