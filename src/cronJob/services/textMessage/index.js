import flatten from 'lodash/flatten'
import omit from 'lodash/omit'
import moment from 'moment'
import { ObjectID } from 'mongodb'
import {
  getNextOutpatients,
  getAppointments,
  PeriodMap,
  getPatients,
} from './data'
import { sendTxt } from '../../../common'

const TemplateId = 'SMS_154586789'

const request = require('request-promise')
const {
  WX_API_URL = 'https://wx-api.gtzh-stg.ihealthcn.com',
  NODE_ENV,
} = process.env

/**
 * 发送微信模板提醒问题
 * @param {*} errorMembers
 */
const sendErrorTemplate = async errorMembers => {
  if (!errorMembers.length) return ''
  const uri = `${WX_API_URL}/pre-reminder/treatment/send`
  const options = {
    method: 'POST',
    uri,
    json: true,
    headers: {
      Authorization: '4Z21FjF',
    },
  }
  try {
    await request(options)
  } catch (error) {
    console.log(error, '~')
  }
}

const preCheckAppointments = async (errorMembers, outpatientIds) => {
  await db.collection('event').insert({
    _id: new ObjectID(),
    eventType: 'treatment/reminder',
    status: errorMembers.length ? 'problem' : 'confirm',
    result: errorMembers,
    outpatientIds,
    createdAt: new Date(),
  })
  await sendErrorTemplate(errorMembers)
}

/**
 * 得到就诊的location位置
 * @param {*} outpatient
 */
const getLocation = outpatient => {
  const {
    hospitalId,
    hospitalName,
    outpatientPeriod,
    location,
    registrationLocation,
    registrationDepartment,
    registrationType,
  } = outpatient

  // 深圳医院希望用 团队管理 而不是 共同照护
  const hospitalNameText = `${hospitalName}${
    hospitalId === 'SHENZHENRENMINYIYUAN' ? '团队管理' : '共同照护'
  }门诊`

  const prefix =
    registrationType === 'ONSITE'
      ? `${registrationLocation}挂${registrationDepartment}的号，`
      : ''
  const outpatientLocation = prefix + location
  const options = {
    period: PeriodMap[outpatientPeriod],
    outpatientLocation,
    hosiptalName: hospitalNameText,
  }
  return options
}

/**
 * 如果患者是上午要抽血的非[朝阳, 301]用户，都需要空腹来
 * @param {*} appointment
 * @param {*} outpatientPeriod
 */
const getAppointmentOptions = (appointment, outpatient) => {
  const { nickname, mobile, type, blood } = appointment
  const { healthCareTeamId, outpatientPeriod } = outpatient
  const options = {
    mobile,
    nickname,
    blood:
      blood &&
      outpatientPeriod === 'MORNING' &&
      ['healthCareTeam3', 'healthCareTeam7'].indexOf(healthCareTeamId) === -1
        ? '空腹（建议带早餐）'
        : '',
    idCard: type === 'first' ? '身份证、' : '',
  }
  return options
}

/**
 * 过滤掉不需要发短信的用户
 * @param {*} opPatients
 * @param {*} appointment
 * @param {*} outpatient
 */
const shouldBePassPatient = (opPatients, appointment, outpatient) => {
  const { _id, appointmentTime, patientId } = appointment
  const { appointmentsId, outpatientDate } = outpatient
  const inOutpatient = appointmentsId.indexOf(_id) !== -1
  const sameDay = moment(appointmentTime).isSame(outpatientDate, 'day')
  const isActivePatient = !!opPatients.filter(
    o =>
      o._id.toString() === patientId &&
      ['ACTIVE', 'HAS_APPOINTMENT'].indexOf(o.patientState) !== -1 &&
      (!o.dontDisturb || !o.dontDisturb.examineReminder),
  ).length

  return inOutpatient && sameDay && isActivePatient
}
/**
 * 给所有人发送短信
 * @param {*} msgMembers
 * @param {*} isTest
 */
const sendAllMsgs = async (msgMembers, isTest) => {
  const isProd = NODE_ENV === 'production'
  const allMsgs = flatten(msgMembers.map(o => o.msgs))
  const allOptions = []
  for (let i = 0; i < allMsgs.length; i++) {
    const item = allMsgs[i]
    const option = {
      mobile: item.mobile,
      templateId: TemplateId,
      params: { ...omit(item, 'mobile') },
    }
    allOptions.push(option)
    try {
      if (!isTest && isProd) {
        await sendTxt(option)
      }
    } catch (error) {
      console.log('send fail')
    }
  }
  return allOptions
}

/**
 * 就诊前一天，给即将要来的患者发短信
 */
export const treatmentReminderViaText = async ({
  nextDays,
  preCheck,
  isTest,
}) => {
  const outpatients = await getNextOutpatients(nextDays)
  const appointmentIds = flatten(outpatients.map(o => o.appointmentsId))
  const appointments = await getAppointments(appointmentIds)
  const allPatientIds = appointments.map(o => o.patientId)
  const allPatients = await getPatients(allPatientIds)
  const msgMembers = []
  const errorMembers = []
  let result = []
  outpatients.forEach(outpatient => {
    const {
      _id,
      appointmentsId,
      outpatientDate,
      outpatientPeriod,
      patientsId,
    } = outpatient
    const temp = {
      date: moment(outpatientDate).format('YYYY-MM-DD'),
      appointmentsId,
      outpatientId: _id,
      msgs: [],
    }
    const locations = getLocation(outpatient)
    const opPatients = allPatients.filter(
      o => patientsId.indexOf(o._id.toString()) !== -1,
    )
    const opAppointments = appointments
      .filter(o => shouldBePassPatient(opPatients, o, outpatient))
      .forEach(ap => {
        temp.msgs.push({
          ...locations,
          ...getAppointmentOptions(ap, outpatient),
        })
      })
    msgMembers.push(temp)
    if (preCheck) {
      const errorAps = appointments
        .filter(o => appointmentsId.indexOf(o._id) !== -1)
        .filter(o => !shouldBePassPatient(opPatients, o, outpatient))
      if (errorAps.length) {
        errorMembers.push(errorAps)
      }
    }
  })
  if (preCheck) {
    await preCheckAppointments(errorMembers, outpatients.map(o => o._id))
    result = errorMembers
  } else {
    const msgResults = await sendAllMsgs(msgMembers, isTest)
    result = msgResults
  }
  return isTest ? result : 'OK'
}
