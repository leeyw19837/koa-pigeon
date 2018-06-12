import * as addOrder from './addOrder'
import * as appointment from './appointment'
import * as assessmentTime from './assessmentTime'
import * as bloodGlucoseMeasurement from './bloodGlucoseMeasurement'
import * as updateRemarkOfBloodglucoses from './bloodGlucoseMeasurement'
import * as changeUsername from './changeUsername'
import * as chatMessages from './chatMessages'
import * as communicationMutations from './communication'
import * as footAssessment from './footAssessment'
import * as loginOrSignUp from './loginOrSignUp'
import * as needleChatMessages from './needleChatMessages'
import * as outHospitalSoap from './outHospitalSoap'
import * as photos from './photos'
import * as reportDevice from './reportDevice'
import * as saveMeals from './saveMeals'
import * as saveUserBehaviors from './saveUserBehaviors'
import * as sendMobileVerificationCode from './sendMobileVerificationCode'
import * as sendNeedleAudioChatMessage from './sendNeedleAudioChatMessage'
import * as sendNeedleImageChatMessage from './sendNeedleImageChatMessage'
import * as sendNeedleTextChatMessage from './sendNeedleTextChatMessage'
import * as sentence from './sentence'
import * as submitFeedback from './submitFeedback'
import * as updateUserDevices from './updateUserDevices'
import * as wechatLoginOrSignUp from './wechatLoginOrSignUp'

import { logQueryOrMutation } from '../utils'

const mutations = {
  ...assessmentTime,
  ...chatMessages,
  ...footAssessment,
  ...photos,
  ...bloodGlucoseMeasurement,
  ...sendNeedleAudioChatMessage,
  ...sendNeedleImageChatMessage,
  ...sendNeedleTextChatMessage,
  ...needleChatMessages,
  ...sendMobileVerificationCode,
  ...loginOrSignUp,
  ...wechatLoginOrSignUp,
  ...communicationMutations,
  ...submitFeedback,
  ...saveMeals,
  ...sentence,
  ...outHospitalSoap,
  ...addOrder,
  ...changeUsername,
  ...reportDevice,
  ...updateUserDevices,
  ...saveUserBehaviors,
  ...appointment,
}

const mutationsWithLogging = {}
Object.keys(mutations).map(
  (mutationName: string) =>
    (mutationsWithLogging[mutationName] = logQueryOrMutation(
      'MUTATION',
      mutationName,
      mutations[mutationName],
    )),
)

export default mutationsWithLogging
