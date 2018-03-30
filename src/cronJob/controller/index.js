import { sendMeasurePlan } from './sendTxt'
import {
  getBgMeasureModules, getHcts,
  getPatients, getBloodGlucoses, getMeasureModules
} from './dataServices'
import { getMeasureFeedback } from './getMeasureFeedback'
import { MONDAY_TEXT_ID , WEDNESDAY_TEXT_ID, typeTextMap } from './constants'

const moment = require('moment')

export const reminder = async (weekday, aPatientsId) => {
  if (!db) {
    console.error('Run with `yarn docker:dev`!')
    process.exit(-1)
  }

  const currentDay = +weekday || moment().isoWeekday()
  const bgMeasureModules = await getBgMeasureModules()
  const hcts = await getHcts()
  const hctIds = hcts.map(o => o._id)
  const patients = await getPatients(hctIds, aPatientsId)
  const patientsId = patients.map(o => o._id.toString())
  const obj = {
    1: 0,
    3: 2,
    7: 6,
  }
  const compareDate = moment().subtract(obj[currentDay], 'days')
  const bloodGlucoses = currentDay !== 1 ? (await getBloodGlucoses(patientsId, compareDate)) : []
  const measureModules = await getMeasureModules(patientsId, compareDate)
  const result = []
  for (let i = 0, pLength = patients.length; i < pLength; i++) {
    // test
    let notCompletedMeasure = {}
    let actualMeasure = {}
    let acturlMeasureModule = {}
    const { _id, username, nickname, healthCareTeamId } = patients[i]
    const patientId = _id.toString()
    const pMeasurePlan = measureModules
      .filter(o => o.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    if (pMeasurePlan) {
      const { bgMeasureModuleId, type } = pMeasurePlan
      const bgMeasureModule = bgMeasureModules.filter(o => o._id === bgMeasureModuleId)[0]
      const htcTeam = hcts.filter(o => o._id === healthCareTeamId[0])[0]
      const options = {
        mobile: username,
        params: {
          hospitalName: htcTeam.institutionName,
          userName: nickname,
        }
      }
      let noSender = false
      if (currentDay === 1) {
        options.params.measureModule = typeTextMap[type]
        options.templateId = MONDAY_TEXT_ID
      } else if (currentDay === 3) {
        options.params.measureModule = typeTextMap[type]
        options.templateId = WEDNESDAY_TEXT_ID
        noSender = !!bloodGlucoses.filter(o => o.author === patientId).length
      } else if (currentDay === 7) {
         const feedBackObj = getMeasureFeedback({
          bloodGlucoses,
          patientId,
          bgMeasureModule,
        })
        // TEST
        notCompletedMeasure = feedBackObj.notCompletedMeasure
        actualMeasure = feedBackObj.actualMeasure
        acturlMeasureModule = bgMeasureModule

        options.params.measureModule = feedBackObj.configOption.measureModule
        options.templateId = feedBackObj.configOption.templateId
      }
      if(!noSender) {
        // await sendMeasurePlan(options)
      }
      result.push({
        notCompletedMeasure,
        actualMeasure,
        acturlMeasureModule,
        options,
      })
    }
  }
  return result
}
