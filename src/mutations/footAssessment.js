// import { parse } from 'date-aware-json'

import { highRiskFoot } from '../utils'

export const saveFootAssessment = async (_, args, { getDb }) => {
  const db = await getDb()

  const {
    recordId,
    updatedAtString,
    assessmentDetailsJson,
    treatmentStateId,
    footBloodAt,
    healthCareTeamId,
  } = args

  const record = await db
    .collection('footAssessment')
    .findOne({ _id: recordId })
  if (!record) {
    return `Can't find footAssessment record with id ${recordId}`
  }

  const treatmentState = await db
    .collection('treatmentState')
    .findOne({ _id: treatmentStateId })
  if (!treatmentState) {
    return `Can't find treatmentState with id ${treatmentStateId}`
  }

  const assessmentDetails = JSON.parse(assessmentDetailsJson)
  const recordResult = await db.collection('footAssessment').findOneAndUpdate(
    { _id: recordId },
    {
      $set: {
        updatedAt: new Date(updatedAtString),
        ...assessmentDetails,
        highRiskFoot: highRiskFoot(assessmentDetails),
        treatmentDate: treatmentState.appointmentTime,
        healthCareTeamId,
      },
    },
  )

  if (!recordResult.ok) {
    return `Error updating footAssessment record: ${JSON.stringify(
      recordResult.lastErrorObject,
    )}`
  }

  const treatmentStateResult = await db
    .collection('treatmentState')
    .findOneAndUpdate(
      { _id: treatmentStateId },
      { $set: { healthCareTeamId, footBloodAt, footAt: true } },
    )

  if (!treatmentStateResult.ok) {
    return `Error updating treatmentState: ${JSON.stringify(
      treatmentStateResult.lastErrorObject,
    )}`
  }

  try {
    await db.collection('event').insert({
      type: 'SAVE_FOOT_ASSESSMENT',
      healthCareTeamId,
      recordId,
      patientId: treatmentState.patientId,
      createdAt: new Date(updatedAtString),
    })
  } catch (e) {
    console.log(`Couldn't save event: ${e.message}`)
  }

  return null
}

const updateFootRecord = async (recordId, setObj, role, db) => {
  await db.collection('footAssessment').update(
    { _id: recordId },
    {
      $set: {
        updatedAt: new Date(),
        role,
        ...setObj,
        highRiskFoot: highRiskFoot(setObj),
        uploadAt: new Date(),
      },
    },
  )
}

export const uploadMultiAssessmentFoots = async (_, args, { getDb }) => {
  const db = await getDb()
  const { healthCareTeamId, role, assessmentDetailsJsons } = args
  let cacheAssessments = []
  try {
    cacheAssessments = JSON.parse(assessmentDetailsJsons)
  } catch (error) {
    throw new Error('parse json error')
  }
  const footRecords = cacheAssessments.filter(
    o => o.healthCareTeamId === healthCareTeamId,
  )
  if (footRecords.length) {
    for (let index = 0; index < footRecords.length; index++) {
      const { recordId, assessmentDetailsJson } = footRecords[index] || {}
      try {
        const setObj = JSON.parse(assessmentDetailsJson)
        if (recordId) {
          await updateFootRecord(recordId, setObj, role, db)
        }
      } catch (error) {
        throw new Error('parse json error')
      }
    }
  }
  return null
}
