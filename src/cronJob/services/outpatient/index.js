import { ObjectID } from 'mongodb'
import difference from 'lodash/difference'
import pick from 'lodash/pick'
import union from 'lodash/union'
import {
  getCurrentOutpatients,
  getAppointments,
  cacheAllData,
  checkProps,
  getNextOutPatient,
  getModuleForOutpatient,
  getPersonalOutpatients,
} from './data'

import { getClinLabResult, getSpecialData, isBetween } from './utils'

const moment = require('moment')

/**
 * 处理预约当天要来但没来的预约
 */
const moveNoCheckInAps = async ({
  outpatient,
  noCheckedApIds,
  noCheckPatientIds,
  noChecktreatmentStateIds,
}) => {
  const { healthCareTeamId, outpatientModuleId } = outpatient
  const state = 'WAITING'
  const nextOp = await getNextOutPatient({
    state,
    healthCareTeamId,
    outpatientModuleId,
  })
  if (nextOp) {
    const { outpatientDate, patientsId, appointmentsId } = nextOp
    const actualApIds = union(appointmentsId, noCheckedApIds)
    const actualPatientIds = union(patientsId, noCheckPatientIds)
    // 把预约加到下一个门诊中
    await db.collection('outpatients').update(
      {
        _id: nextOp._id,
      },
      {
        $set: {
          appointmentsId: actualApIds,
          patientsId: actualPatientIds,
          updatedAt: new Date(),
        },
      },
    )
    // 把预约的时间改到跟下次门诊一样
    await db.collection('appointments').update(
      {
        _id: { $in: noCheckedApIds },
      },
      {
        $set: {
          appointmentTime: new Date(outpatientDate),
          updatedAt: new Date(),
        },
      },
      {
        multi: true,
      },
    )
    // 把对应的treatement的时间改到跟下次门诊一样
    await db.collection('treatmentState').update(
      {
        _id: { $in: noChecktreatmentStateIds },
      },
      {
        $set: {
          appointmentTime: new Date(outpatientDate),
          updatedAt: new Date(),
        },
      },
      {
        multi: true,
      },
    )
  }
}

const matchInfosForPatient = ({ checkInPatientIds, cacheData, outpatient }) => {
  const {
    _id,
    outpatientDate,
    dayOfWeek,
    outpatientPeriod,
    healthCareTeamId,
  } = outpatient
  const personalOpInstances = []
  checkInPatientIds.forEach(patientId => {
    const personalOp = {
      _id: new ObjectID().toString(),
      outpatientId: _id,
      patientId,
      treatmentDate: outpatientDate,
      dayOfWeek,
      outpatientPeriod,
      healthCareTeamId,
    }
    const defaultParam = {
      outpatientDate,
      patientId,
    }
    checkProps.forEach(propItem => {
      const { dataKey, dateProperty, opKey, isDelay, isWho, status } = propItem
      const data = cacheData[dataKey]
      const records = getSpecialData(defaultParam, {
        dateProperty,
        data,
        isDelay,
        isWho,
        status,
      })
      if (records.length) {
        personalOp[opKey] =
          dataKey === 'soap' ? records.map(o => o._id) : records[0]._id
      }
      const appointment = cacheData.appointments.length
        ? cacheData.appointments.filter(o => o.patientId === patientId)[0]
        : {}
      const apStatus = appointment.type
      const pClinicalResults = getClinLabResult(
        apStatus,
        outpatientDate,
        cacheData.clinicalLabResults,
        patientId,
      )
      if (pClinicalResults.length) {
        personalOp.clinicalResultIds = pClinicalResults.map(o => o._id)
      }
      personalOp.status = apStatus
    })
    personalOpInstances.push(personalOp)
  })
  return personalOpInstances
}

/**
 * 缓存所有与这些病人相关的数据，例如a1c, 病历，预约，soap，各种评估表
 * 并且创建
 * @param {*} param0
 */
const searchPersonalDataInOutpatient = async ({
  outpatient,
  checkInPatientIds,
  checkInApIds,
}) => {
  const { _id } = outpatient
  const existedPersonalOps = await getPersonalOutpatients({
    outpatientId: _id,
    appointmentsId: checkInApIds,
  })
  const existedPersonalPids = existedPersonalOps.map(o => o.patientId)
  const needCreatePatientIds = checkInPatientIds.filter(
    o => existedPersonalPids.indexOf(o) === -1,
  )
  let personalOutpatientsId = []
  if (needCreatePatientIds.length) {
    const cacheData = await cacheAllData(needCreatePatientIds)
    const allPersonalOps = matchInfosForPatient({
      checkInPatientIds: needCreatePatientIds,
      cacheData,
      outpatient,
    })
    const result = await db
      .collection('personalOutpatients')
      .insert(allPersonalOps)
    personalOutpatientsId = allPersonalOps.map(o => o._id)
  }

  await db.collection('outpatients').update(
    {
      _id,
    },
    {
      $set: {
        state: 'COMPLETED',
        patientsId: checkInPatientIds,
        appointmentsId: checkInApIds,
        updatedAt: new Date(),
      },
      $push: {
        personalOutpatientsId: { $each: personalOutpatientsId },
      },
    },
  )
}

const _generateDateMapAppointments = data => {
  const dateMapAppointments = {}
  data.forEach(ap => {
    const { appointmentTime } = ap
    const dateKey = moment(appointmentTime).format('YYYY-MM-DD')
    if (!dateMapAppointments[dateKey]) {
      dateMapAppointments[dateKey] = [ap]
    } else {
      dateMapAppointments[dateKey].push(ap)
    }
  })
  return dateMapAppointments
}

const createOutpatientInstance = async ({
  dateKey,
  hctId,
  appointments,
  outpatientModuleId,
}) => {
  const opModule = await getModuleForOutpatient({ outpatientModuleId })
  const addProps = [
    'location',
    'dayOfWeek',
    'hospitalId',
    'hospitalName',
    'outpatientPeriod',
    'registrationLocation',
    'registrationDepartment',
    'doctorId',
    'doctorName',
  ]
  const patientsId = appointments.map(o => o.patientId)
  const appointmentsId = appointments.map(o => o._id)
  const outpatient = {
    _id: new ObjectID().toString(),
    patientsId,
    appointmentsId,
    state: 'WAITING',
    outpatientDate: moment(dateKey).startOf('day')._d,
    healthCareTeamId: hctId,
    ...pick(opModule, addProps),
    outpatientModuleId: opModule._id,
    dutyEmployees: [],
    note: '系统统一生成历史数据',
    report: {
      patients: patientsId.length,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  return outpatient
}

/**
 * 幂等操作
 * @param {*} appointments
 * @param {*} opInstances
 */
const getNeedCreatedAppointments = (appointments, opInstances) =>
  appointments.filter(
    ap =>
      !opInstances.filter(op => op.appointmentsId.indexOf(ap._id) !== -1)
        .length,
  )

/**
 * 当天建完病历的人，生成了下次预约，目前老院内的还无法处理建预约并且挂钩门诊实例
 *
 * 因此需要手动创建门诊实例
 */
const createNextTreatmentOp = async ({ outpatient, checkInPatientIds }) => {
  const { healthCareTeamId, outpatientModuleId } = outpatient
  const opInstances = await getCurrentOutpatients({
    isFurther: true,
    outpatientModuleId,
  })
  const todayAppointments = await getAppointments({
    isTodayCreated: true,
    checkInPatientIds,
  })
  const appointments = getNeedCreatedAppointments(
    todayAppointments,
    opInstances,
  )
  const needUpdateOp = []
  const needAddOp = []
  if (appointments.length) {
    const result = _generateDateMapAppointments(appointments)
    const dateKeys = Object.keys(result)
    for (let i = 0; i < dateKeys.length; i++) {
      const dateKey = dateKeys[i]
      const opInstance = opInstances.filter(o =>
        moment(o.outpatientDate).isSame(dateKey, 'day'),
      )[0]
      if (opInstance) {
        const dateApIds = result[dateKey].map(o => o._id)
        const { appointmentsId } = opInstance
        const actualApIds = difference(dateApIds, appointmentsId)
        const actualPatientIds = result[dateKey]
          .filter(o => actualApIds.indexOf(o._id) !== -1)
          .map(o => o.patientId)
        if (actualApIds.length) {
          needUpdateOp.push({
            opId: opInstance._id,
            actualApIds,
            actualPatientIds,
          })
        }
      } else {
        const patientInstance = await createOutpatientInstance({
          dateKey,
          hctId: healthCareTeamId,
          appointments,
          outpatientModuleId,
        })
        needAddOp.push(patientInstance)
      }
    }
  }
  if (needUpdateOp.length) {
    for (let index = 0; index < needUpdateOp.length; index++) {
      const updateOp = needUpdateOp[index]
      await db.collection('outpatients').update(
        {
          _id: updateOp.opId,
        },
        {
          $push: {
            appointmentsId: { $each: updateOp.actualApIds },
            patientsId: { $each: updateOp.actualPatientIds },
          },
          $set: {
            updatedAt: new Date(),
          },
        },
      )
    }
  }
  if (needAddOp.length) {
    await db.collection('outpatients').insert(needAddOp)
  }
}

/**
 * 当天门诊结束的时候，需要做两件事
 * 1. 把已经建病历的这些预约都关联到各自的个人门诊上
 * 1.1 把未签到的病人自动挪到下一诊
 *
 * 2.当天建完病历的人，生成了下次预约，目前老院内的还无法处理建预约并且挂钩门诊实例
 * 2.1 因此需要手动创建门诊实例
 */
export const completeOutpatient = async () => {
  const dateOutpatients = await getCurrentOutpatients({})
  if (dateOutpatients.length) {
    for (let index = 0; index < dateOutpatients.length; index++) {
      const outpatient = dateOutpatients[index]
      const {
        patientsId,
        appointmentsId,
        healthCareTeamId,
        dayOfWeek,
      } = outpatient
      const appointments = await getAppointments({ appointmentsId })
      const checkedAps = appointments.filter(o => o.isOutPatient)
      const noCheckedAps = appointments.filter(o => !o.isOutPatient)
      if (noCheckedAps.length) {
        const noCheckedApIds = noCheckedAps.map(o => o._id)
        const noCheckPatientIds = noCheckedAps.map(o => o.patientId)
        const noChecktreatmentStateIds = noCheckedAps.map(
          o => o.treatmentStateId,
        )
        moveNoCheckInAps({
          outpatient,
          noCheckedApIds,
          noCheckPatientIds,
          noChecktreatmentStateIds,
        })
      }
      if (checkedAps.length) {
        const checkInPatientIds = checkedAps.map(o => o.patientId)
        const checkInApIds = checkedAps.map(o => o._id)
        await searchPersonalDataInOutpatient({
          outpatient,
          checkInPatientIds,
          checkInApIds,
        })
        await createNextTreatmentOp({
          outpatient,
          checkInPatientIds,
        })
      }
    }
  }
}
