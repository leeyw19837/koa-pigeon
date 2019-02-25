import freshId from 'fresh-id'
import dayjs from 'dayjs'
import union from 'lodash/union'
import isEmpty from 'lodash/isEmpty'
import findIndex from 'lodash/findIndex'
import pick from 'lodash/pick'
import { ObjectID } from 'mongodb'
import { pubsub } from '../pubsub'

const WEEKDAYS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
export const movePatientToOutpatientPlan = async (_, args, context) => {
  const db = await context.getDb()

  const { patientId, toPlan, fromPlanId, disease } = args

  const existsPlan = await db.collection('outpatientPlan').findOne(toPlan)
  let result
  if (!existsPlan) {
    const extraData = { patientId: patientId, disease: disease }
    const planObj = {
      _id: freshId(),
      ...toPlan,
      dayOfWeek: WEEKDAYS[dayjs(toPlan.date).day()],
      hospitalName: '朝阳医院',
      department: '内分泌',
      patientIds: [patientId],
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
    const index = findIndex(existsPlan.extraData, { patientId: patientId })
    const extraPart = pick(args, ['nextVisitDate', 'disease', 'mobile'])
    let setter
    if (!isEmpty(extraPart)) {
      extraPart.patientId = patientId
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

    result = await db.collection('outpatientPlan').update(
      { _id: existsPlan._id },
      {
        $addToSet: { patientIds: patientId },
        ...setter,
      },
    )
    result.result.ok &&
      pubsub.publish('outpatientPlanDynamics', {
        ...existsPlan,
        patientIds: union(existsPlan.patientIds, [patientId]),
        _operation: 'UPDATED',
      })
  }

  if (fromPlanId && result.result.ok) {
    result = await db.collection('outpatientPlan').update(
      { _id: fromPlanId },
      {
        $pull: { patientIds: patientId, signedIds: patientId },
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
  return result.result.ok
}
export const outpatientPlanCheckIn = async (
  _,
  { patientId, planId },
  context,
) => {
  const db = await context.getDb()

  const existsPlan = await db
    .collection('outpatientPlan')
    .findOne({ _id: planId })
  if (!existsPlan) return false

  const isSameDay = dayjs().format('YYYY-MM-DD') === existsPlan.date
  if (!isSameDay) throw new Error('the outpatient not open!')

  const result = await db
    .collection('outpatientPlan')
    .update({ _id: planId }, { $addToSet: { signedIds: patientId } })
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

export const cancelCheckIn = async (_, { patientId, planId }, context) => {
  const db = await context.getDb()
  const existsPlan = await db
    .collection('outpatientPlan')
    .findOne({ _id: planId })
  if (!existsPlan) return false

  const isSameDay = dayjs().format('YYYY-MM-DD') === existsPlan.date
  if (!isSameDay) throw new Error('cannot cancel a non-preset check-in')

  const result = await db
    .collection('outpatientPlan')
    .update({ _id: planId }, { $pull: { signedIds: patientId } })

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
