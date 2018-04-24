import { patientList, ORDER_SUCCESS_TEMPLATE } from './constants'
import { sendTxt } from '../../common'

export const orderSuccessPatients = async (isSender) => {
  console.log(patientList.length, '@patientList')
  for (let i = 0; i < patientList.length; i++) {
    if(isSender) {
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
