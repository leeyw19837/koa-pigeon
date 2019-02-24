import freshId from 'fresh-id'
import dayjs from 'dayjs'
import union from 'lodash/union'
import findIndex from 'lodash/findIndex'
import pick from 'lodash/pick'
import { pubsub } from '../pubsub'

const WEEKDAYS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
export const movePatientToOutpatientPlan = async (
  _,
  { patientId, toPlan, fromPlanId },
  context,
) => {
  const db = await context.getDb()

  const existsPlan = await db.collection('outpatientPlan').findOne(toPlan)
  let result
  if (!existsPlan) {
    const planObj = {
      _id: freshId(),
      ...toPlan,
      dayOfWeek: WEEKDAYS[dayjs(toPlan.date).day()],
      hospitalName: '朝阳医院',
      department: '内分泌',
      patientIds: [patientId],
      signedIds: [],
      createdAt: new Date(),
    }
    result = await db.collection('outpatientPlan').insert(planObj)
    result.result.ok &&
      pubsub.publish('outpatientPlanDynamics', {
        ...planObj,
        _operation: 'ADDED',
      })
  } else {
    result = await db.collection('outpatientPlan').update(
      { _id: existsPlan._id },
      {
        $addToSet: { patientIds: patientId },
        $set: { updatedAt: new Date() },
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
  db.collection('outpatientPlan').update(
    { _id: planId },
    { $addToSet: { signedIds: patientId } },
  )
}

export const cancelCheckIn = async (_, { patientId, planId }, context) => {
  const db = await context.getDb()
  const existsPlan = await db
    .collection('outpatientPlan')
    .findOne({ _id: planId })
  if (!existsPlan) return false

  const isSameDay = dayjs().isSame(existsPlan.date, 'day')
  if (!isSameDay) throw new Error('cannot cancel a non-preset check-in')

  const result = await db
    .collection('outpatientPlan')
    .update({ _id: planId }, { $pull: { signedIds: patientId } })
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
    const extraPart = pick(patient, ['nextVisitDate', 'disease', 'mobile'])
    let setter
    if (index < 0) {
      setter = {
        $push: extraPart,
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
  await db.collection('wildPatients').update(
    { _id: patient._id },
    {
      $set: {
        ...pick(patient, [
          'name',
          'mobile',
          'idCard',
          'avatar',
          'status',
          'disease',
          'nextVisitDate',
        ]),
        updatedBy: operatorId,
        updatedAt: new Date(),
      },
    },
  )

  return true
}
