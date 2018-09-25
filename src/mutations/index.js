import * as addOrder from './addOrder'
import * as appointment from './appointment'
import * as assessmentTime from './assessmentTime'
import * as bloodGlucoseMeasurement from './bloodGlucoseMeasurement'
import * as changeUsername from './changeUsername'
import * as updateBG1Reason from './updateBG1Reason'
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
import * as sendNeedleTaskChatMessage from './sendNeedleTaskChatMessage'
import * as sentence from './sentence'
import * as submitFeedback from './submitFeedback'
import * as updateUserDevices from './updateUserDevices'
import * as wechatLoginOrSignUp from './wechatLoginOrSignUp'
import * as changeChatCardStatus from './changeChatCardStatus'
import * as blogs from './blogs'
import * as saveTaskSoap from './saveTaskSoap'
import * as foodComments from './foodComments'
import * as saveFoodContents from './saveFoodContents'
import * as alipayOrder from './alipayOrder'
import * as intervention from './interventionTask'
import * as glycatedHemoglobinAchieve from './glycatedHemoglobinAchieve'
import * as updateBadges from './updateBadges'
import * as sharing from './sharing'
import * as changeAchieveShowStatus from './changeAchieveShowStatus'
import * as sessions from './sessions'
import * as updateContentType from './updateContentType'
import * as updateTag from './tags'
import * as saveNewQA from './saveNewQA'
import * as retrainQA from './retrainQA'
import * as assessment from './assessment'
import * as updateCdeDutyStopPeriod from './updateCdeDutyStopPeriod'
import * as updateCdeDutyPeopleperDay from './updateCdeDutyPeopleperDay'
import * as updateCdeDutyAdjective from './updateCdeDutyAdjective'
import * as updateQAStatus from './updateQAStatus'
import * as patient from './patient'

import { logQueryOrMutation } from '../utils'

import { logandAuthForApp } from '../utils/authentication'

const mutations = {
  ...assessmentTime,
  ...chatMessages,
  ...footAssessment,
  ...photos,
  ...bloodGlucoseMeasurement,
  ...sendNeedleAudioChatMessage,
  ...sendNeedleImageChatMessage,
  ...sendNeedleTextChatMessage,
  ...sendNeedleTaskChatMessage,
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
  ...updateBG1Reason,
  ...reportDevice,
  ...updateUserDevices,
  ...saveUserBehaviors,
  ...appointment,
  ...changeChatCardStatus,
  ...blogs,
  ...saveTaskSoap,
  ...foodComments,
  ...saveFoodContents,
  ...alipayOrder,
  ...intervention,
  ...glycatedHemoglobinAchieve,
  ...updateBadges,
  ...sharing,
  ...changeAchieveShowStatus,
  ...sessions,
  ...updateContentType,
  ...updateTag,
  ...retrainQA,
  ...saveNewQA,
  ...assessment,
  ...updateCdeDutyStopPeriod,
  ...updateCdeDutyPeopleperDay,
  ...updateCdeDutyAdjective,
  ...updateQAStatus,
  ...patient,
}

const mutationsWithAuthandLog = {}

Object.keys(mutations).map(
  mutationName =>
    (mutationsWithAuthandLog[mutationName] = logandAuthForApp(
      'MUTATION',
      mutationName,
      mutations[mutationName],
    )),
)

export default mutationsWithAuthandLog
