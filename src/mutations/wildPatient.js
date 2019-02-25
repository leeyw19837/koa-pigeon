import freshId from 'fresh-id'
import { movePatientToOutpatientPlan } from './outpatientPlan'

export const addWildPatient = async (
  _,
  { operatorId, patient, planId },
  context,
) => {
  const db = await context.getDb()
  const { mobile, idCard } = patient
  const isDuplicate = await db.collection('wildPatients').count({
    mobile,
    idCard,
  })
  if (isDuplicate) throw new Error('No duplicate mobile or idCard allowed')
  const patientId = freshId()
  const result = await db.collection('wildPatients').insert({
    _id: patientId,
    status: 'NOT_FIRST_VISIT',
    ...patient,
    createdAt: new Date(),
    createdBy: operatorId,
  })
  await movePatientToOutpatientPlan(
    null,
    { patientId, toPlan: { _id: planId } },
    context,
  )
  return result.result.ok
}
