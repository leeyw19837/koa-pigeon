import freshId from 'fresh-id'
import dayjs from 'dayjs'

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
  } else {
    result = await db
      .collection('outpatientPlan')
      .update(
        { _id: existsPlan._id },
        {
          $addToSet: { patientIds: patientId },
          $set: { updatedAt: new Date() },
        },
      )
  }

  if (fromPlanId && result.result.ok) {
    result = await db
      .collection('outpatientPlan')
      .update(
        { _id: fromPlanId },
        { $pull: { patientIds: patientId, signedIds: patientId } },
      )
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
