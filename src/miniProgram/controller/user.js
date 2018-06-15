const isEmpty = require('lodash/isEmpty')
import {
  getPatient,
  getTodayAppointment,
  getNextAppointment,
  getReview,
} from './dataServices'

const htcMap = {
  healthCareTeam1: '北大医院',
  healthCareTeam2: '潞河医院',
  healthCareTeam3: '朝阳医院',
  ihealthCareTeam: 'iHealthLabs',
  healthCareTeam5: '北京大学首钢医院',
  healthCareTeam6: '东方医院',
}

export const getPatientByUnionId = async unionid => {
  console.log(unionid)
  const result = {
    type: 'POTENTIAL',
    unionid,
  }

  const patient = await getPatient(unionid)

  if (isEmpty(patient)) return result

  const { _id, nickname, healthCareTeamId } = patient
  const patientId = _id.toString()
  const review = await getReview(patientId)
  const todayAppointment = await getTodayAppointment(patientId)
  if (!isEmpty(todayAppointment) && isEmpty(review)) {
    result.type = 'TODAY_HAS_APPOINTMENT'
    result.appointment = todayAppointment
  } else {
    const nextAp = await getNextAppointment(patientId)
    result.type = 'NEXT_APPOINTMENT'
    result.appointment = nextAp
  }

  return result
}
