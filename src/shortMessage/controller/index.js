import {
  patientList,
  ORDER_SUCCESS_TEMPLATE,
  STOP_OUTPATIENT_TEMPLATE,
  STOP_OUTPATIENT_TEMPLATE_DW,
} from './constants'
import { sendTxt } from '../../common'

export const orderSuccessPatients = async isSender => {
  console.log(patientList.length, '@patientList')
  for (let i = 0; i < patientList.length; i++) {
    if (isSender) {
      const { nickname, mobile } = patientList[i]
      try {
        // await sendTxt({
        //   mobile,
        //   templateId: ORDER_SUCCESS_TEMPLATE,
        //   params: {
        //     userName: nickname,
        //   }
        // })
      } catch (e) {
        console.log(e, '~~~')
      }
    }
  }
}

export const stopOutpatientService = async isSender => {
  const allPatientBeidaLists = await db
    .collection('users')
    .find({
      patientState: 'ACTIVE',
      healthCareTeamId: 'healthCareTeam1',
      roles: { $exists: 0 },
    })
    .toArray()
  for (let i = 0; i < allPatientBeidaLists.length; i++) {
    if (isSender) {
      const { nickname, username } = allPatientBeidaLists[i]
      try {
        // await sendTxt({
        //   mobile: username.split('@')[0],
        //   templateId: STOP_OUTPATIENT_TEMPLATE_DW,
        //   params: {
        //     userName: nickname,
        //   },
        // })
      } catch (e) {
        console.log(e, '~~~')
      }
    }
  }
}
