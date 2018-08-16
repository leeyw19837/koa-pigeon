import {
  patientList,
  ORDER_SUCCESS_TEMPLATE,
  STOP_OUTPATIENT_TEMPLATE,
  STOP_OUTPATIENT_TEMPLATE_DW,
  sportPatientList,
  pairMeasureFoodPatients,
  FOOD_PAIR_MEASURE,
} from './constants'
import { sendTxt } from '../../common'

export const sportPatients = async isSender => {
  await sendTxt({
    mobile: '18612201226',
    templateId: 'SMS_139982056',
    params: {
      nickname: '刘欢',
    },
  })
  console.log(sportPatientList.length, '@patientList')
  for (let i = 0; i < sportPatientList.length; i++) {
    const { nickname, mobile } = sportPatientList[i]
    try {
      // await sendTxt({
      //   mobile,
      //   templateId: 'SMS_139982056',
      //   params: {
      //     nickname,
      //   },
      // })
    } catch (e) {
      console.log(e, '~~~')
    }
  }
}

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

export const sendFoodPairMeasure = async isSender => {
  await sendTxt({
    mobile: '18612201226',
    templateId: FOOD_PAIR_MEASURE,
    params: {
      nickname: '刘欢',
    },
  })
  console.log(pairMeasureFoodPatients.length, '@pairMeasureFoodPatients')
  for (let i = 0; i < pairMeasureFoodPatients.length; i++) {
    if (isSender) {
      const { nickname, mobile } = pairMeasureFoodPatients[i]
      try {
        // await sendTxt({
        //   mobile,
        //   templateId: FOOD_PAIR_MEASURE,
        //   params: {
        //     nickname,
        //   },
        // })
        console.log(i, mobile)
      } catch (e) {
        console.log(e, '~~~')
      }
    }
  }
}
