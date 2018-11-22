import flatten from 'lodash/flatten'
import omit from 'lodash/omit'
import moment from 'moment'
import { getNextOutpatients, getAppointments, PeriodMap } from './data'
import { sendTxt } from '../../../common'

const TemplateId = 'SMS_151233986'

const getLocation = outpatient => {
  const {
    hospitalName,
    outpatientPeriod,
    location,
    registrationLocation,
    registrationDepartment,
    registrationType,
  } = outpatient

  const prefix =
    registrationType === 'ONSITE'
      ? `${registrationLocation}挂${registrationDepartment}的号，后`
      : ''
  const outpatientLocation = prefix + location
  const options = {
    period: PeriodMap[outpatientPeriod],
    outpatientLocation,
    hosiptalName: hospitalName,
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
        ? '空腹带上早餐'
        : '',
    idCard: type === 'first' ? '身份证、' : '',
  }
  return options
}

/**
 * 就诊前一天，给即将要来的患者发短信
 */
export const treatmentReminderViaText = async ({ isTest, nextDays }) => {
  const outpatients = await getNextOutpatients(nextDays)
  const appointmentIds = flatten(outpatients.map(o => o.appointmentsId))
  const appointments = await getAppointments(appointmentIds)
  const msgMembers = []
  outpatients.forEach(outpatient => {
    const {
      _id,
      appointmentsId,
      outpatientDate,
      outpatientPeriod,
      location,
      registrationLocation,
      registrationDepartment,
      registrationType,
    } = outpatient
    const temp = {
      date: moment(outpatientDate).format('YYYY-MM-DD'),
      appointmentsId,
      outpatientId: _id,
      msgs: [],
    }
    const locations = getLocation(outpatient)
    const opAppointments = appointments
      .filter(
        o =>
          appointmentsId.indexOf(o._id) !== -1 &&
          moment(o.appointmentTime).isSame(outpatientDate, 'day'),
      )
      .forEach(ap => {
        temp.msgs.push({
          ...locations,
          ...getAppointmentOptions(ap, outpatient),
        })
      })
    msgMembers.push(temp)
  })
  if (isTest) {
    try {
      await sendTxt({
        mobile: '15011311636',
        templateId: TemplateId,
        params: {
          nickname: '张亚飞',
          period: '上午',
          hosiptalName: '北大医院',
          blood: '空腹带上早餐',
          outpatientLocation:
            '门诊一层挂“共同照护”的号，后到门诊楼2层内科照护门诊就诊',
        },
      })
    } catch (error) {
      console.log(error, '@error')
    }
  }
  const allMsgs = flatten(msgMembers.map(o => o.msgs))
  for (let i = 0; i < allMsgs.length; i++) {
    const item = allMsgs[i]
    const option = {
      mobile: item.mobile,
      templateId: TemplateId,
      params: { ...omit(item, 'mobile') },
    }
  }
  return msgMembers
}
