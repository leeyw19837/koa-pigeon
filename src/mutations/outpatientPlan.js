import freshId from 'fresh-id'
import dayjs from 'dayjs'
import union from 'lodash/union'
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

export const cancelCheckIn = async (_, { patientId, planId }, context) => {
  const db = await context.getDb()
  const existsPlan = await db
    .collection('outpatientPlan')
    .findOne({ _id: planId })
  if (!existsPlan) return true

  const isSameDay = dayjs().isSame(existsPlan.date, 'day')
  if (!isSameDay) throw new Error('cannot cancel a non-preset check-in')

  const result = await db
    .collection('outpatientPlan')
    .update({ _id: planId }, { $pull: { signedIds: patientId } })
  return result.result.ok
}
