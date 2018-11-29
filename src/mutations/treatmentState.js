import { ObjectID } from 'mongodb'
import find from 'lodash/find'
import moment from 'moment'
import isEmpty from 'lodash/isEmpty'

// 如果有其他检查项已做的话，不能取消签到
const canBeCancel = treatmentState => {
  const shouldChecks = [
    'nutritionAt',
    'insulinAt',
    'footAt',
    'diagnosis',
    'healthTech',
    'print',
    'blood',
    'testBlood',
    'footBloodAt',
    'eyeGroundAt',
    'quantizationAt',
    'offLineTech',
  ]
  return !shouldChecks.filter(o => treatmentState[o]).length
}

/**
 * 得到当天签到的顺序
 * @param {*} outpatientId
 */
const getCheckInCounts = async outpatientId => {
  const { appointmentsId } = await db
    .collection('outpatients')
    .findOne({ _id: outpatientId })
  const treatmentStateIds = await db
    .collection('appointments')
    .distinct('treatmentStateId', {
      _id: { $in: appointmentsId },
      patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
      isOutPatient: true,
    })

  const aps = await db
    .collection('treatmentState')
    .find({ _id: { $in: treatmentStateIds }, checkIn: true })
    .sort({ orderNumber: -1 })
    .limit(1)
    .toArray()
  return aps.length ? aps[0].orderNumber : 0
}

/**
 * 如果是初诊或者年诊取消签到的话，需要把上次年度时间给赋值回去
 * @param {*} patientId
 */
const getPreyearTime = async patientId => {
  const appointments = await db
    .collection('appointments')
    .find({
      patientId,
      patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
    })
    .sort({
      appointmentTime: -1,
    })
    .toArray()
  const { appointmentTime } =
    find(appointments, o => /year|first/g.test(o.type)) || {}
  return appointmentTime
}

/**
 * 签到的时候需要同步信息到user上
 * @param {*} param0
 */
const operateUser = async ({
  patientId,
  treatmentId,
  treatmentType,
  value,
}) => {
  const defaultSet = {
    latestTSID: treatmentId,
    updatedAt: new Date(),
  }
  if (treatmentType === 'first') {
    defaultSet.patientState = value ? 'ACTIVE' : 'HAS_APPOINTMENT'
  }
  if (/first|year/g.test(treatmentType)) {
    defaultSet.preYearApTime = value
      ? new Date()
      : await getPreyearTime(patientId)
  }
  await db
    .collection('users')
    .update(
      { _id: ObjectID.createFromHexString(patientId) },
      { $set: defaultSet },
    )
}

const operateCheckIn = async ({ treatment, appointmentId, value }) => {
  const { patientId, type, _id } = treatment
  await db
    .collection('appointments')
    .update({ _id: appointmentId }, { $set: { isOutPatient: value } })
  await operateUser({ patientId, treatmentType: type, treatmentId: _id, value })
}

export const mutateTreatmentCheckboxs = async (_, args, context) => {
  const { propName, propValue, treatmentId, outpatientId } = args
  const treatmentState = await db
    .collection('treatmentState')
    .findOne({ _id: treatmentId })
  const appointment = await db.collection('appointments').findOne({
    treatmentStateId: treatmentId,
    patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
  })
  if (!treatmentState || !appointment) {
    const tip = `Can't not find ${treatmentId} for appointment or treateState, this is not a correct _id`
    console.log(`------------ ${tip} -------------`)
    throw new Error(tip)
  }
  const { type, _id } = appointment

  const timingKey = `timing.${propName}`

  const setObj = {
    [propName]: propValue,
    updatedAt: new Date(),
  }
  const unSetObj = {}
  if (propValue) {
    setObj[timingKey] = new Date()
    if (propName === 'checkIn')
      setObj.orderNumber = (await getCheckInCounts(outpatientId)) + 1
  } else {
    unSetObj[timingKey] = ''
    if (propName === 'checkIn') unSetObj.orderNumber = ''
  }

  const condition = isEmpty(unSetObj)
    ? { $set: setObj }
    : { $set: setObj, $unset: unSetObj }

  if (propName === 'checkIn') {
    if (!canBeCancel(treatmentState) && !propValue) {
      return {
        status: 'fail',
        tip: '其他检查项已做的话，不能取消签到',
      }
    } else {
      await operateCheckIn({
        treatment: treatmentState,
        appointmentId: _id,
        value: propValue,
      })
    }
  }

  // 当抽血的变为true的时候，需要添加验血字段
  if (propName === 'blood') {
    setObj.testBlood = propValue ? false : null
  }
  await db.collection('treatmentState').update({ _id: treatmentId }, condition)
  return {
    status: 'success',
  }
}
const getBMI = (weight, height) =>
  weight && height ? (weight / Math.pow(height / 100, 2)).toFixed(2) : null

export const mutateTreatmentSign = async (_, args, context) => {
  const { treatmentId, patientId, treatmentSign } = args
  // 传入treatment user and so on
  await db
    .collection('treatmentState')
    .update({ _id: treatmentId }, { $set: { bodyCheck: treatmentSign } })
  console.log(args)
  const { height, weight, HP, LP } = treatmentSign

  await db.collection('users').update(
    { _id: ObjectID.createFromHexString(patientId) },
    {
      $set: { height, weight, HP, LP },
    },
  )

  const isCs = await db.collection('caseRecord').findOne({
    patientId,
    caseRecordAt: {
      $gte: moment().startOf('day')._d,
      $lt: moment().endOf('day')._d,
    },
  })

  if (isCs) {
    const { caseContent } = isCs
    const { bodyCheckup } = caseContent
    await db.collection('caseRecord').update(
      {
        _id: isCs._id,
      },
      {
        $set: {
          'caseContent.bodyCheckup.height': height || bodyCheckup.height,
          'caseContent.bodyCheckup.weight': weight || bodyCheckup.weight,
          'caseContent.bodyCheckup.HP': HP || bodyCheckup.HP,
          'caseContent.bodyCheckup.LP': LP || bodyCheckup.LP,
          'caseContent.bodyCheckup.bmi':
            getBMI(weight, height) || bodyCheckup.bmi,
        },
      },
    )
  }
  return true
}

export const mutateUserAppInfo = async (_, args, context) => {
  const { patientId, notUseAppReason } = args
  await db.collection('users').update(
    { _id: ObjectID.createFromHexString(patientId) },
    {
      $set: { notUseAppReason },
    },
  )
  return true
}

export const mutateUserOneWeekMeasureInfo = async (_, args, context) => {
  const {patientId, oneWeekNotMeasure} = args
  await db.collection('users').update(
    {_id: ObjectID.createFromHexString(patientId)},
    {
      $set: {oneWeekNotMeasure},
    },
  )
  return true
}

