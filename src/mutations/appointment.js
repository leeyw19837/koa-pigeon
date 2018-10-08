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
/**
 * 基于预约id 更新预约
 * 只不过参数是整个预约
 * @param {*} _
 * @param {*} param1
 * @param {*} context
 */
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

/**
 * 当照护师更新预约的 预约状态的时候，需要同步修改 3天和7天的就诊卡片的状态
 * @param {*} param0
 */
const handleConfirmStatusChange = async ({ propValue, appointmentId }) => {
  if (propValue !== 'manualConfirm') return
  const cardMeasssge = await db
    .collection('needleChatMessages')
    .find(
      {
        messageType: 'CARD',
        'content.recordId': appointmentId,
        'content.status': { $ne: 'OVERDUE' },
      },
      { sort: { createdAt: -1 } },
    )
    .toArray()
  if (
    cardMeasssge.length &&
    cardMeasssge[0].content.status !== 'POSTPONED' &&
    cardMeasssge[0].content.status !== 'CDE_CONFIRMED'
  ) {
    await db.collection('needleChatMessages').update(
      {
        _id: cardMeasssge[0]._id,
      },
      {
        $set: {
          'content.status': 'CDE_CONFIRMED',
        },
      },
    )
  }

  await db.collection('appointments').update(
    { _id: appointmentId },
    {
      $set: {
        confirmStatus: propValue,
        updatedAt: new Date(),
      },
    },
  )
}

const changeAppointmentInOutpatient = async ({
  appointmentId,
  toOutpatientId,
  patientId,
}) => {
  const setObj = {
    appointmentsId: appointmentId,
    patientsId: patientId,
  }
  await db.collection('outpatients').update(
    {
      appointmentsId: appointmentId,
      state: { $ne: 'COMPLETED' },
      patientsId: patientId,
    },
    {
      $pull: setObj,
      $set: {
        updatedAt: new Date(),
      },
    },
  )

  await db.collection('outpatients').update(
    {
      _id: toOutpatientId,
    },
    {
      $push: setObj,
      $set: {
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * 当预约的预约时间修改的时候，有几个地方需要同步
 * 1. 当修改的日期使当前的预约从【复诊】变成【年诊】的时候，需要把当前的状态改变
 * 2. 胰岛素评估，如果一直往后延期大于了150天，并且上次病历开了胰岛素的药物，需要重新做胰岛素评估
 * 3. 如果修改前预约时间是当天的话，需要新生成一条treatmentState，并且设置为delete状态
 * 4. 就诊状态需要同步此修改
 * 5. 如果在修改的时候有就诊卡片，需要把就诊卡片的状态更新成 “已改期”
 * 6. 需要把outpatient中的预约的id，改到相对应的一诊上去
 * @param {*} param0
 */
const handleAppointmentTimeChange = async ({
  propValue,
  appointmentId,
  appointment,
  toOutpatientId,
}) => {
  const {
    type,
    appointmentTime,
    treatmentStateId,
    healthCareTeamId,
    patientId,
  } = appointment
  const cursor = {
    appointmentTime: propValue,
    updatedAt: new Date(),
  }
  const treatmentState = await db
    .collection('treatmentState')
    .findOne({ _id: treatmentStateId })
  // 第一步
  if (type && type === 'quarter') {
    const { preYearApTime } = Users.findOne({
      _id: ObjectID.createFromHexString(patientId),
    })
    const changeToYear = moment(propValue).isAfter(
      moment(preYearApTime)
        .add(48, 'week')
        .subtract(1, 'day'),
      'day',
    )
    cursor.type = changeToYear ? 'year' : 'quarter'
  }
  // 第二步
  const getInsulinAt = async () => {
    let insulinAt = false
    const caseRecords = await db
      .collection('caseRecord')
      .find({
        patientId,
        status: { $ne: 'addition' },
      })
      .sort({ createdAt: -1 })
      .toArray()
    if (
      caseRecords.length > 0 &&
      moment(caseRecords[0].caseRecordAt)
        .add(150, 'd')
        .isBefore(propValue)
    ) {
      const medicine = caseRecords[0].caseContent.prescription.medicines
      const filterIns =
        medicine.length > 0
          ? medicine.filter(
              a => a.medicineType === 'insulin' && a.status !== 'stop',
            )
          : []
      insulinAt = filterIns.length > 0
    }
    return insulinAt
  }

  const actualInsulinAt = await getInsulinAt()
  // 第三步
  const isToday = moment(appointmentTime, 'day').isSame(new Date(), 'day')
  if (isToday) {
    const trContent = {
      ...treatmentState,
      _id: new ObjectID().toString(),
      status: 'delete',
    }
    await db.collection('treatmentState').insertOne(trContent)
  }
  // 第五步
  const cardMeasssge = await db
    .collection('needleChatMessages')
    .find({
      messageType: 'CARD',
      'content.recordId': appointmentId,
      'content.status': { $ne: 'OVERDUE' },
    })
    .sort({ createdAt: -1 })
    .toArray()
  if (cardMeasssge.length) {
    await db.collection('needleChatMessages').update(
      { _id: cardMeasssge[0]._id },
      {
        $set: {
          'content.status': 'POSTPONED',
          'content.postponedDate': propValue,
        },
      },
    )
  }

  await db.collection('treatmentState').update(
    { _id: treatmentStateId },
    {
      $set: {
        ...cursor,
        insulinAt: actualInsulinAt ? false : null,
      },
    },
  )
  await db.collection('appointments').update(
    { _id: appointmentId },
    {
      $set: {
        ...cursor,
        insulinAt: actualInsulinAt,
      },
    },
  )

  await changeAppointmentInOutpatient({
    appointmentId,
    toOutpatientId,
    patientId,
  })
}

/**
 * 更新某一个预约上的属性
 * propKey 预约的key
 * propValue 需要更改预约的值
 * @param {*} _
 * @param {*} param1
 * @param {*} context
 */
export const updateAppointmentByPropName = async (_, params, context) => {
  const { propKey, propValue, appointmentId } = params
  const dbAppointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })
  if (!dbAppointment) {
    throw new Error('Appointment _id is not existed!')
  }
  switch (propKey) {
    case 'confirmStatus':
      await handleConfirmStatusChange(params)
      break
    case 'appointmentTime':
      await handleAppointmentTimeChange(params)
      break
    default:
      await db.collection('appointments').update(
        {
          _id,
        },
        {
          $set: {
            [propKey]: propValue,
            updatedAt: new Date(),
          },
        },
      )
      break
  }
}
