import { ObjectID } from 'mongodb'
import find from 'lodash/find'

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
  return aps.length ? aps[0].orderNumber : 1
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
    updateAt: new Date(),
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

const operateCheckIn = async ({
  outpatientId,
  treatment,
  appointmentId,
  value,
  treatmentType,
}) => {
  const { patientId, type, _id } = treatment
  console.log(treatment._id, '~~')
  let count = 0
  if (value) {
    count = (await getCheckInCounts(outpatientId)) + 1
  }
  const condition = value
    ? {
        $set: {
          checkIn: value,
          orderNumber: count,
          updateAt: new Date(),
        },
      }
    : {
        $unset: {
          orderNumber: '',
        },
        $set: { checkIn: false },
      }
  await db.collection('treatmentState').update({ _id }, condition)
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
  if (propName === 'checkIn') {
    if (!canBeCancel(treatmentState) && !propValue) {
      return {
        status: 'fail',
        tip: '其他检查项已做的话，不能取消签到',
      }
    } else {
      await operateCheckIn({
        outpatientId,
        treatment: treatmentState,
        appointmentId: _id,
        value: propValue,
        treatmentType: type,
      })
    }
  }

  const timingKey = `timing.${propName}`
  const timeCondition = propValue
    ? { $set: { [timingKey]: new Date() } }
    : { $unset: { [timingKey]: '' } }

  await db
    .collection('treatmentState')
    .update({ _id: treatmentId }, timeCondition)

  return {
    status: 'success',
  }
}
