import pick from 'lodash/pick'
import omit from 'lodash/omit'
import { ObjectID } from 'mongodb'
import { changeUsername } from './changeUsername'
import { changeUserProperties } from '../modules/appointment'
import {verify} from "righteous-raven";
const {
  RIGHTEOUS_RAVEN_URL,
  RIGHTEOUS_RAVEN_ID,
  RIGHTEOUS_RAVEN_KEY,
} = process.env
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

  const pinyinName = getPinyinUsername(nickname)
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
        pinyinName,
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
  console.log('addPatientAppointment', params)
  const {
    willAttendToday,
    currentOutPatientId,
    institutionId,
    nickname,
    source,
    mobile,
  } = params

  const existedUser = await db
    .collection('users')
    .findOne({ username: { $regex: mobile } })
  const isExisted = !!existedUser
  if (
    isExisted &&
    ['POTENTIAL', 'REMOVED', 'WILD'].indexOf(existedUser.patientState) === -1
  ) {
    throw new Error('mobile_duplicated')
  }

  const username = mobile
  const currentUser = existedUser
  const pinyinName = getPinyinUsername(nickname)

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
      pinyinName,
      institutionId,
    })
  } else if (
    currentUser.patientState === 'POTENTIAL' ||
    currentUser.patientState === 'REMOVED' ||
    currentUser.patientState === 'WILD'
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
          pinyinName,
        },
      },
    )
  }
  const appresult = await db.collection('appointments').insert({
    _id: new ObjectID().toString(),
    patientId: patientId.toString(),
    ...omit(params, ['willAttendToday', 'currentOutPatientId']),
    createdAt: new Date(),
    isOutPatient: false,
  })

  if (willAttendToday && currentOutPatientId) {
    const currentDayOutPatientInfo = await db
      .collection('outpatients')
      .findOne({ _id: currentOutPatientId })
    const treatmentStateId = await updateOutpatientStates(
      null,
      {
        patientId: patientId.toString(),
        appointmentTime: currentDayOutPatientInfo.outpatientDate,
        outpatientId: currentOutPatientId,
      },
      context,
    )
    return {
      patientId,
      treatmentStateId,
    }
  }
  context.response.set('effect-types', 'PatientList,PatientDetail')
  return {
    patientId,
    treatmentStateId: '',
  }
}

/**
 * 基于预约id 更新预约
 * 只不过参数是整个预约
 * 适用于 多个属性需要被修改
 * 姓名，电话，来源
 * @param {*} _
 * @param {*} param1
 * @param {*} context
 */
export const updateAppointmentById = async (_, { appointment }, context) => {
  const { _id, patientId, nickname, mobile, source } = appointment
  const dbAppointment = await db.collection('appointments').findOne({ _id })
  if (!dbAppointment) {
    throw new Error(`Appointment ${_id} is not existed!`)
  }
  if (mobile !== dbAppointment.mobile) {
    const result = await changeUsername(
      _,
      { patientId, newUsername: mobile },
      context,
    )
    if (!result) {
      return 'duplicate'
    }
  }
  if (nickname !== dbAppointment.nickname || source !== dbAppointment.source) {
    await changeUserProperties(_, { patientId, nickname, source })
  }
  return 'OK'
}

/**
 * 更新检查项目
 * @param {*} _
 * @param {*} param1
 */
export const updateCheckItemsForAppointment = async (
  _,
  { checkItems, appointmentId },
) => {
  const dbAppointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })
  if (!dbAppointment) {
    throw new Error(`Appointment ${appointmentId} is not existed!`)
  }
  const { treatmentStateId } = dbAppointment
  const treatment = await db
    .collection('treatmentState')
    .findOne({ _id: treatmentStateId })
  if (!treatment) {
    throw new Error(`treatment ${treatmentStateId} is not existed!`)
  }
  // 如果当前这个字段已经是true了，就不能再改变这个值了
  const checkItemKeys = Object.keys(checkItems).filter(
    itemKey => !treatment[itemKey],
  )
  await db.collection('appointments').update(
    { _id: appointmentId },
    {
      $set: {
        ...pick(checkItems, checkItemKeys),
        updatedAt: new Date(),
      },
    },
  )
  const treatmentObj = {}
  checkItemKeys.forEach(o => {
    treatmentObj[o] = checkItems[o] ? false : null
  })
  await db.collection('treatmentState').update(
    { _id: treatmentStateId },
    {
      $set: {
        ...treatmentObj,
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * 当照护师更新预约的 预约状态的时候，需要同步修改 3天和7天的就诊卡片的状态
 * @param {*} param0
 */
const handleConfirmStatusChange = async ({ propValue, appointmentId }) => {
  await db.collection('appointments').update(
    { _id: appointmentId },
    {
      $set: {
        confirmStatus: propValue,
        updatedAt: new Date(),
      },
    },
  )

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
      state: { $nin: ['COMPLETED', 'MODIFIED', 'CANCELED'] },
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
  const getInsulinAt = async initInsulinAt => {
    let insulinAt = initInsulinAt === false ? true : false
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

  const actualInsulinAt = await getInsulinAt(treatmentState.insulinAt)
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
 * 适用于 单个属性需要被修改
 * @param {*} _
 * @param {*} param1
 * @param {*} context
 */
export const updateAppointmentByPropName = async (_, params, context) => {
  const {
    propKey,
    propValue,
    appointmentId,
    toOutpatientId,
    isSyncToTreatment,
  } = params
  const dbAppointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })
  if (!dbAppointment) {
    throw new Error('Appointment _id is not existed!')
  }
  const { treatmentStateId } = dbAppointment
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
    default: {
      const setObj = { [propKey]: propValue, updatedAt: new Date() }
      await db
        .collection('appointments')
        .update({ _id: appointmentId }, { $set: setObj })
      if (isSyncToTreatment) {
        await db
          .collection('treatmentState')
          .update({ _id: treatmentStateId }, { $set: setObj })
      }
      break
    }
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
      healthCareTeamId: [institution._id],
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
          healthCareTeamId: [institution._id],
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
  // context.response.set('effect-types', 'PatientList,PatientDetail')
  return treatmentStateId
}

/**
 * 初诊的预约是可以被移出【已预约】变成待预约
 * @param {*} _
 * @param {*} param1
 */
export const moveAppointmentOut = async (
  _,
  { appointmentId, outpatientId },
) => {
  const appointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })

  if (!appointment) {
    throw new Error(`${appointmentId} Appointment _id is not existed!`)
  }
  const { treatmentStateId, appointmentTime, patientId } = appointment

  await db.collection('appointments').update(
    { _id: appointmentId },
    {
      $unset: { appointmentTime: '', treatmentStateId: '' },
    },
  )

  await db
    .collection('users')
    .update(
      { _id: ObjectID.createFromHexString(patientId) },
      { $set: { patientState: 'NEEDS_APPOINTMENT', updatedAt: new Date() } },
    )

  await db.collection('outpatients').update(
    { _id: outpatientId },
    {
      $pull: { appointmentsId: appointmentId, patientsId: patientId },
      $set: { updatedAt: new Date() },
    },
  )

  // 如果移出的时候是当天的话，需要把treatmentState设置为 delete
  if (moment().isSame(appointmentTime, 'day')) {
    await db
      .collection('treatmentState')
      .update(
        { _id: treatmentStateId },
        { $set: { status: 'delete', updatedAt: new Date() } },
      )
  } else {
    await db.collection('treatmentState').remove({ _id: treatmentStateId })
  }
  return ''
}

/**
 * 删除加诊
 * @param {*} _
 * @param {*} param1
 */
export const deleteAdditionAppointment = async (
  _,
  { appointmentId, outpatientId },
) => {
  const appointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })

  if (!appointment) {
    throw new Error(`${appointmentId} Appointment _id is not existed!`)
  }
  const { treatmentStateId, patientId } = appointment

  await db.collection('appointments').remove({ _id: appointmentId })
  await db.collection('treatmentState').remove({ _id: treatmentStateId })
  await db.collection('outpatients').update(
    { _id: outpatientId },
    {
      $pull: { appointmentsId: appointmentId, patientsId: patientId },
      $set: { updatedAt: new Date() },
    },
  )
  return ''
}

const getPinyinUsername = name => {
  const clearName = name.trim()
  const pinyinFull = PinyinHelper.convertToPinyinString(
    clearName,
    '',
    PinyinFormat.WITHOUT_TONE,
  )
  let initial = pinyinFull[0]
  if (!/[A-Za-z]/.test(initial)) {
    initial = '~'
  }
  const pinyin = {
    full: pinyinFull,
    short: PinyinHelper.convertToPinyinString(
      clearName,
      '',
      PinyinFormat.FIRST_LETTER,
    ),
    initial,
  }
  return pinyin
}

const removeOtherAdditions = async appointmentIds => {
  const additions = await db
    .collection('appointments')
    .find({
      _id: { $in: appointmentIds },
      type: 'addition',
      isOutPatient: false,
    })
    .toArray()
  if (!additions.length) return
  const patientId = additions[0].patientId
  const additionIds = additions.map(o => o._id)
  const treatmentIds = additions.map(o => o.treatmentStateId)

  await db.collection('appointments').remove({ _id: { $in: additionIds } })
  await db.collection('treatmentState').remove({ _id: { $in: treatmentIds } })

  await db.collection('outpatients').update(
    {
      appointmentsId: { $in: additionIds },
    },
    {
      $pull: {
        appointmentsId: { $in: additionIds },
        patientsId: patientId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
    {
      multi: true,
    },
  )
}

const getLatestCheckInAppointment = async patientId => {
  const latestCheckInAp = await db
    .collection('appointments')
    .find({
      patientId,
      isOutPatient: true,
      type: { $ne: 'addition' },
    })
    .sort({
      appointmentTime: -1,
    })
    .limit(1)
    .toArray()
  if (!latestCheckInAp[0]) {
    throw new Error(`此患者不符合加诊情况: ${patientId}`)
  }
  return latestCheckInAp[0]
}

const getDefaultAppointment = async patientId => {
  const user =
    (await db
      .collection('users')
      .findOne({ _id: ObjectID.createFromHexString(patientId) })) || {}
  const latestCheckInAp = await getLatestCheckInAppointment(patientId)
  const pickKeys = [
    'patientId',
    'nickname',
    'source',
    'isTelephoneFollowUp',
    'hisNumber',
    'note',
    'healthCareTeamId',
    'insulinAt',
  ]
  const defaultOption = {
    mobile: user.username || latestCheckInAp.mobile,
    ...pick(latestCheckInAp, pickKeys),
    status: 1,
    isOutPatient: false,
    createdAt: new Date(),
  }
  return {
    defaultAp: defaultOption,
    defaultTr: {
      ...omit(defaultOption, [
        'isTelephoneFollowUp',
        'status',
        'isOutPatient',
        'insulinAt',
      ]),
      checkIn: false,
      diagnosis: false,
      print: false,
    },
  }
}

export const createAddition = async (
  _,
  { patientId, outpatientId, additionIds = [], appointmentTime },
) => {
  const { defaultAp, defaultTr } = await getDefaultAppointment(patientId)
  const treatmentState = {
    _id: new ObjectID().toString(),
    ...defaultTr,
    type: 'addition',
    appointmentTime,
  }
  const appointment = {
    _id: new ObjectID().toString(),
    ...omit(defaultAp, 'insulinAt'),
    type: 'addition',
    appointmentTime,
    treatmentStateId: treatmentState._id,
  }

  await db.collection('appointments').insertOne(appointment)

  await db.collection('treatmentState').insertOne(treatmentState)

  await db.collection('outpatients').update(
    {
      _id: outpatientId,
    },
    {
      $push: {
        appointmentsId: appointment._id,
        patientsId: patientId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  )
  if (additionIds.length) {
    await removeOtherAdditions(additionIds)
  }
  return 'OK'
}

export const moveQuarterReplaceAddition = async (
  _,
  { appointmentId, outpatientId, additionIds = [], appointmentTime },
) => {
  const appointment = await db
    .collection('appointments')
    .findOne({ _id: appointmentId })

  if (!appointment) {
    throw new Error(`${appointmentId} Appointment _id is not existed!`)
  }
  const { treatmentStateId, patientId } = appointment
  const setObj = {
    $set: {
      appointmentTime,
      updatedAt: new Date(),
    },
  }

  await db.collection('appointments').update({ _id: appointmentId }, setObj)

  await db
    .collection('treatmentState')
    .update({ _id: treatmentStateId }, setObj)

  const getSetObj = type => {
    const key = type === 'add' ? '$push' : '$pull'
    return {
      [key]: {
        appointmentsId: appointmentId,
        patientsId: patientId,
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  }

  await db
    .collection('outpatients')
    .update({ appointmentsId: appointmentId }, getSetObj())

  await db
    .collection('outpatients')
    .update({ _id: outpatientId }, getSetObj('add'))

  if (additionIds.length) {
    await removeOtherAdditions(additionIds)
  }
  return 'OK'
}

const getPreYearTime = async patientId => {
  const user =
    (await db
      .collection('users')
      .findOne({ _id: ObjectID.createFromHexString(patientId) })) || {}
  const firstAp =
    (await db
      .collection('appointments')
      .findOne({ patientId, type: 'first' })) || {}
  return user.preYearApTime || firstAp.appointmentTime
}

export const createQuarterReplaceAddition = async (
  _,
  {
    patientId,
    outpatientId,
    additionIds = [],
    appointmentTime,
    mgtOutpatientId,
    mgtAppointmentTime,
  },
) => {
  const actualApTime = mgtOutpatientId ? mgtAppointmentTime : appointmentTime

  const preYearApTime = await getPreYearTime(patientId)

  const maxYearApTime = moment(preYearApTime).add(7 * 56, 'days', '_d')
  const minYearApTime = moment(preYearApTime).add(7 * 48, 'days', '_d')
  const type = moment(actualApTime).isBetween(minYearApTime, maxYearApTime)
    ? 'year'
    : 'quarter'

  const { defaultAp, defaultTr } = await getDefaultAppointment(patientId)
  const yearCheckProps = [
    'footAt',
    'eyeGroundAt',
    'quantizationAt',
    'healthTech',
  ]
  const getChecks = (type, isTr) => {
    let result = {}
    if (type === 'year')
      return yearCheckProps.forEach(o => {
        result[o] = isTr ? false : true
      })
    return result
  }
  const treatmentState = {
    _id: new ObjectID().toString(),
    ...defaultTr,
    ...getChecks(type, true),
    blood: false,
    healthTech: false,
    app: false,
    type,
    appointmentTime: actualApTime,
  }
  const appointment = {
    _id: new ObjectID().toString(),
    ...defaultAp,
    type,
    blood: true,
    healthTech: true,
    ...getChecks(type),
    appointmentTime: actualApTime,
    treatmentStateId: treatmentState._id,
  }

  await db.collection('appointments').insertOne(appointment)

  await db.collection('treatmentState').insertOne(treatmentState)

  await db.collection('outpatients').update(
    {
      _id: mgtOutpatientId || outpatientId,
    },
    {
      $push: {
        appointmentsId: appointment._id,
        patientsId: patientId,
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  )
  if (mgtOutpatientId) {
    await createAddition(null, {
      patientId,
      outpatientId,
      additionIds,
      appointmentTime,
    })
  } else if (additionIds.length) {
    await removeOtherAdditions(additionIds)
  }
  return 'OK'
}

export const updateOutpatientInfos = async (_, params, context) => {
  const {
    outpatientId,
    state,
    outpatientDate,
    outpatientPeriod,
    doctorId,
  } = params
  const originalOutpatient = await db
    .collection('outpatients')
    .findOne({ _id: outpatientId })
  if (!originalOutpatient) {
    throw new Error(
      `no outpatient record matching this outpatientId: ${outpatientId}`,
    )
  }

  // 修改门诊状态
  // 1、开诊、停诊 统一处理，只修改state分别为WAITING、CANCELED
  // 2、改期单独处理。
  // 2.1 注意：将被改期的诊的state状态设定为'MODIFIED'，同时在outpatients中创建一条新诊，状态是'WAITING'
  // 2.2 改诊一定是创建了一条新诊，不存在将改期的诊叠加到现有诊的情况（因为这种情况就相当于停诊了）
  // 2.3 改期需要首先创建全新一诊，对于每个被改期的患者，都要经历 改变预约时间的 过程，因此都要走一遍 预约时间更改的逻辑
  if (state === 'WAITING' || state === 'CANCELED') {
    await db.collection('outpatients').update(
      {
        _id: outpatientId,
      },
      {
        $set: {
          state,
          updatedAt: new Date(),
        },
      },
    )
  } else if (state === 'MODIFIED') {
    // const appointedPatientIds = originalOutpatient.patientsId
    const appointmentIds = originalOutpatient.appointmentsId
    // 格式化为 形如 MON TUE ... SAT SUN
    const dayOfWeek = moment(outpatientDate)
      .format('ddd')
      .toUpperCase()
    // const unchangedItems = [
    //   'patientsId',
    //   'appointmentsId',
    //   'personalOutpatientsId',
    //   'healthCareTeamId',
    //   'location',
    //   'hospitalId',
    //   'hospitalName',
    //   'registrationLocation',
    //   'registrationDepartment',
    //   'registrationType',
    //   'doctorId',
    //   'doctorName',
    //   'outpatientModuleId',
    //   'dutyEmployees',
    // ]
    const insertObj = {
      state: 'WAITING',
      outpatientDate,
      dayOfWeek,
      outpatientPeriod,
      updatedAt: new Date(),
    }

    // 更新这条诊的时间
    await db.collection('outpatients').update(
      {
        _id: outpatientId,
      },
      {
        $set: {
          ...insertObj,
        },
      },
    )

    // 遍历涉及的患者，执行预约时间更改的逻辑
    if (appointmentIds.length > 0) {
      const propValue = moment(outpatientDate).startOf('day')._d
      appointmentIds.forEach(async (item, index) => {
        const dbAppointment = await db
          .collection('appointments')
          .findOne({ _id: item })
        if (!dbAppointment) {
          throw new Error('Appointment _id is not existed!')
        }
        await handleAppointmentTimeChange({
          propValue,
          appointmentId: item,
          appointment: dbAppointment,
          toOutpatientId: outpatientId,
        })
      })
    }

    // 更新旧诊状态
    // await db.collection('outpatients').update({
    //   _id: outpatientId,
    // },{
    //   $set:{
    //     state,
    //     updatedAt: new Date(),
    //   }
    // })
  }

  // 修改出诊医生
  // 待确定需求：修改出诊医生时，只修改医生的姓名和id还是相关的其他信息都要修改？
  if (doctorId) {
    if (doctorId !== originalOutpatient.doctorId) {
      const outpatientModule = await db
        .collection('outpatientModules')
        .findOne({ doctorId })
      await db.collection('outpatients').update(
        {
          _id: outpatientId,
        },
        {
          $set: {
            doctorId,
            doctorName: outpatientModule.doctorName,
          },
        },
      )
    }
  }

  return true
}

export const applyForAppointment = async (_, params, context) => {
  const {
    mobile,
    verificationCode
  } = params

  if (!/^1[3|4|5|6|7|8|9][0-9]\d{8}$/.test(mobile)) {
    throw new Error('手机号码格式不正确')
    return
  }

  if (verificationCode && verificationCode!==''){
    const verificationResult = await verify(RIGHTEOUS_RAVEN_URL, {
      client_id: RIGHTEOUS_RAVEN_ID,
      client_key: RIGHTEOUS_RAVEN_KEY,
      rec: mobile,
      code: verificationCode,
    })
    if ( verificationResult.data.result !== 'success') {
      throw new Error('verification_error')
    }
  }

  // 标记预约申请来自于APP
  params.source = 'from_app'
  const addAppointmentResult = await addPatientAppointment(_, params, context)

  console.log('applyForAppointment >> addAppointmentResult=',addAppointmentResult)

  if (addAppointmentResult.patientId) {
    return true
  }
  return false
}
