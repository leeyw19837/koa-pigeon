
import { healthCareTeamMap } from './constants'
import { getAppointments, getCaseRecords, getPatientsByIds } from './dataServices'

const moment = require('moment')
const request = require('request-promise')
const { NODE_ENV } = process.env

const sendApi = async (patientId) => {
  const url = 'https://wx-api-gtzh.ihealthlabs.com.cn'
  const uri = `${url}/wechat/mini-program/send?patientId=${patientId}&pwd=4Z21FjF`
  const options = {
    method: 'GET',
    uri,
  }
  return await request(options)
}

export const sendMiniProgram = async (period, patientId) => {
  if (NODE_ENV === 'production') {
    if(patientId) {
      await sendApi(patientId)
    } else {
      const currentDay = moment().isoWeekday()
      const appointments = await getAppointments()
      const availableAppointments = appointments.filter(o => {
        const { healthCareTeamId } = o
        return (
          healthCareTeamMap[healthCareTeamId]
          && healthCareTeamMap[healthCareTeamId][currentDay]
          && healthCareTeamMap[healthCareTeamId][currentDay] === period
        )
      })

      const patientIds = availableAppointments.map(o => o.patientId)
      const patients = await getPatientsByIds(patientIds)
      const hasWechatInfo = patients.filter(o => o.wechatInfo && !!o.wechatInfo.openid)
      const hasWechatPids = hasWechatInfo.map(o => o._id.toString())
      const caseRecords = await getCaseRecords(hasWechatPids)
      const availablePids = caseRecords.map(o => o.patientId)
      if (availablePids.length) {
        for (let i = 0; i < availablePids.length; i++) {
          const pId = availablePids[i]
          try {
            await sendApi(pId)
          } catch (e) {
            console.log(e)
          }
        }
      }
    }
  }
}
