const moment = require('moment')

export const checkProps = [
  {
    dataKey: 'appointments',
    dateProperty: 'appointmentTime',
    opKey: 'appointmentId',
    patientState: 'ARCHIVED',
  },
  {
    dataKey: 'caseRecord',
    dateProperty: 'caseRecordAt',
    opKey: 'caseRecordId',
  },
  {
    dataKey: 'treatmentState',
    dateProperty: 'appointmentTime',
    opKey: 'treatmentStateId',
    status: 'delete',
  },
  {
    dataKey: 'footAssessment',
    dateProperty: 'treatmentDate',
    opKey: 'footAssessmentId',
  },
  {
    dataKey: 'nutritionAssessment',
    dateProperty: 'treatmentDate',
    opKey: 'nutritionId',
    isDelay: true,
  },
  {
    dataKey: 'quantization',
    dateProperty: 'treatmentTime',
    opKey: 'quantizationId',
    isDelay: true,
  },
  {
    dataKey: 'soap',
    dateProperty: 'appointmentTime',
    opKey: 'soapIds',
    isDelay: true,
  },
  {
    dataKey: 'usageSurvey',
    dateProperty: 'treatmentTime',
    opKey: 'usageSurveyId',
    isDelay: true,
    isWho: true,
  },
]

export const getModuleForOutpatient = async ({ outpatientModuleId }) => {
  return await db.collection('outpatientModules').findOne({
    _id: outpatientModuleId,
  })
}

export const getCurrentOutpatients = async ({
  isFurther,
  outpatientModuleId,
}) => {
  const startAt = moment().startOf('day')._d
  const endAt = moment().endOf('day')._d
  let cursor = {
    // state: 'WAITING', 为了幂等操作
    outpatientDate: {
      $gte: startAt,
      $lt: endAt,
    },
  }
  if (isFurther) {
    cursor = {
      state: 'WAITING',
      outpatientDate: {
        $gt: endAt,
      },
      outpatientModuleId,
    }
  }
  return await db
    .collection('outpatients')
    .find(cursor)
    .toArray()
}

export const getAppointments = async ({
  appointmentsId,
  isTodayCreated,
  checkInPatientIds,
}) => {
  let cursor = {
    _id: { $in: appointmentsId },
  }
  if (isTodayCreated) {
    const startAt = moment().startOf('day')._d
    const endAt = moment().endOf('day')._d
    cursor = {
      createdAt: {
        $gte: startAt,
        $lt: endAt,
      },
      isOutPatient: false,
      appointmentTime: {
        $gt: endAt,
      },
      patientId: { $in: checkInPatientIds },
    }
  }
  return await db
    .collection('appointments')
    .find({
      ...cursor,
      patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
    })
    .toArray()
}

export const cacheAllData = async patientIds => {
  const connections = [
    'appointments',
    'caseRecord',
    'treatmentState',
    'clinicalLabResults',
    'footAssessment',
    'nutritionAssessment',
    'quantization',
    'soap',
    'usageSurvey',
  ]
  const result = {}
  for (let index = 0; index < connections.length; index++) {
    const connectionName = connections[index]
    const Model = db.collection(connectionName)
    let cursor = {}
    if (connectionName === 'usageSurvey') {
      cursor = { who: { $in: patientIds } }
    } else {
      cursor = { patientId: { $in: patientIds } }
    }
    result[connectionName] = await Model.find(cursor).toArray()
  }

  return result
}

export const getNextOutPatient = async ({
  state,
  healthCareTeamId,
  outpatientModuleId,
}) => {
  const endAt = moment().endOf('day')._d
  const nextOp = await db
    .collection('outpatients')
    .find({
      state: 'WAITING',
      healthCareTeamId,
      outpatientModuleId,
      outpatientDate: {
        $gt: endAt,
      },
    })
    .sort({
      outpatientDate: 1,
    })
    .limit(1)
    .toArray()
  return nextOp.length ? nextOp[0] : null
}

export const getPersonalOutpatients = async ({
  outpatientId,
  appointmentsId,
}) => {
  return await db
    .collection('personalOutpatients')
    .find({
      outpatientId,
      appointmentId: { $in: appointmentsId },
    })
    .toArray()
}
