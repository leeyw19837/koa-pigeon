import pick from 'lodash/pick'
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
  const existedUser = await db
    .collection('users')
    .findOne({ username: { $regex: mobile } })
  const isExisted = !!existedUser
  if (
    isExisted &&
    existedUser._id.toString() !== patientId &&
    ['POTENTIAL', 'REMOVED'].indexOf(existedUser.patientState) === -1
  ) {
    throw new Error('mobile_duplicated')
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
    throw new Error('mobile_duplicated')
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
  await db.collection('appointments').insert({
    _id: new ObjectID().toString(),
    patientId: patientId.toString(),
    ...params,
  })
  context.response.set('effect-types', 'PatientList,PatientDetail')
  return true
}

const syncInfo = async ({ patientId, key, value }) => {
  if (value === '') return
  const setKey = key === 'mobile' ? 'username' : key
  const $userObj = {
    [setKey]: value,
    updatedAt: new Date(),
  }
  const $setObj = {
    [key]: value,
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
    { $set: $userObj },
  )
}

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
  if (mobile !== dbAppointment.mobile) {
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

  if (appointment.nickname !== dbAppointment.nickname) {
    await syncInfo({
      patientId,
      key: 'nickname',
      value: nickname,
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
  return 'OK'
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
    const { preYearApTime } = await db.collection('users').findOne({
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
  const { propKey, propValue, appointmentId, toOutpatientId } = params
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
      await handleAppointmentTimeChange({
        propValue: moment(propValue).startOf('day')._d,
        appointmentId,
        appointment: dbAppointment,
        toOutpatientId,
      })
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

/**
 * 更新 待预约 至 预约
 * @param _
 * @param params
 * @param context
 * @returns {Promise<void>}
 */
export const updateOutpatientStates = async (_, params, context) => {
  const { patientId, appointmentTime, outpatientId } = params
  const dbAppointment = await db
    .collection('appointments')
    .findOne({ patientId })
  if (!dbAppointment) {
    throw new Error('Appointment patientId does not exist in DB!')
  }

  // 第一步：向treatmentState中插入一条数据（从预约表中颉取）
  const immutableFields = pick(dbAppointment, [
    'source',
    'status',
    'nickname',
    'mobile',
    'note',
    'patientId',
    'hisNumber',
  ])

  const {
    blood,
    nutritionAt,
    footAt,
    eyeGroundAt,
    quantizationAt,
    insulinAt,
    healthTech,
    institutionId,
  } = dbAppointment
  const institution = await db
    .collection('healthCareTeams')
    .findOne({ institutionId })
  const treatmentStateId = new ObjectID().toString()
  await db.collection('treatmentState').insert({
    _id: treatmentStateId,
    ...immutableFields,
    appointmentTime,
    checkIn: false,
    type: 'first',
    createdAt: new Date(),
    blood: blood ? false : blood !== null ? false : null,
    sendBlood: blood ? false : blood !== null ? false : null,
    nutritionAt: nutritionAt ? false : nutritionAt !== null ? false : null,
    footAt: footAt ? false : footAt !== null ? false : null,
    eyeGroundAt: eyeGroundAt ? false : eyeGroundAt !== null ? false : null,
    quantizationAt: quantizationAt
      ? false
      : quantizationAt !== null
        ? false
        : null,
    insulinAt: insulinAt ? false : insulinAt !== null ? false : null,
    healthTech: healthTech ? false : healthTech !== null ? false : null,
    diagnosis: false,
    print: false,
    healthCareTeamId: institution._id,
  })

  // 第二步：更新 user 表中 patientState 为 HAS_APPOINTMENT
  const existedUser = await db
    .collection('users')
    .findOne({ _id: ObjectID.createFromHexString(patientId) })
  if (!existedUser) {
    await db.collection('users').insert({
      _id: new ObjectID(),
      nickname: dbAppointment.nickname,
      username: dbAppointment.mobile,
      createdAt: new Date(),
      healthCareTeamId: institution._id,
      patientState: 'HAS_APPOINTMENT',
      source: dbAppointment.source,
    })
  } else {
    await db.collection('users').update(
      {
        _id: ObjectID.createFromHexString(patientId),
      },
      {
        $set: {
          patientState: 'HAS_APPOINTMENT',
        },
      },
    )
  }

  // 第三步：更新 appointment 表中 type 为 'first'，增加 appointmentTime， 增加 treatmentStateId
  await db.collection('appointments').update(
    {
      patientId,
    },
    {
      $set: {
        type: 'first',
        appointmentTime,
        treatmentStateId,
        healthCareTeamId: institution._id,
      },
    },
  )

  // 第四步：更新 outPatients 表中对应该 outpatientId 的记录，﻿patientsId 和﻿appointmentsId 分别加入一条当前预约记录
  const existedOutPatient = await db
    .collection('outpatients')
    .findOne({ _id: outpatientId })
  if (!existedOutPatient) {
    throw new Error('outPatients outpatientId does not exist in DB!')
  }
  await db.collection('outpatients').update(
    {
      _id: outpatientId,
    },
    {
      $push: {
        patientsId: patientId,
        appointmentsId: dbAppointment._id,
      },
    },
  )
  context.response.set('effect-types', 'PatientList,PatientDetail')
  return true
}
