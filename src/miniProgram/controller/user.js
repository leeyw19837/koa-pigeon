
const isEmpty = require('lodash/isEmpty')
import { getPatient, getTodayAppointment, getNextAppointment } from './dataServices'

const htcMap = {
  healthCareTeam1: '北大医院',
  healthCareTeam2: '潞河医院',
  healthCareTeam3: '朝阳医院',
  ihealthCareTeam: 'iHealthLabs',
  healthCareTeam5: '北京大学首钢医院',
}

export const getPatientByUnionId = async (wxInfo) => {
  const { openid, unionid } = wxInfo
  console.log(openid, unionid, wxInfo)
  const result = {
    type: 'POTENTIAL',
    openid,
    unionid,
  }

  const patient = await getPatient(unionid)

  if (isEmpty(patient)) return result

  const { _id, nickname, healthCareTeamId } = patient
  const patientId = _id.toString()
  const todayAppointment = await getTodayAppointment(patientId)
  if (!isEmpty(todayAppointment)) {
    result.type = 'TODAY_HAS_APPOINTMENT'
    result.appointment = todayAppointment
  } else {
    const nextAp = await getNextAppointment(patientId)
    result.type = 'NEXT_APPOINTMENT'
    result.appointment = nextAp
  }

  return result
}
