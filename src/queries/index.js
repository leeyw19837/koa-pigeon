import * as bloodGlucoseMeasurements from './bloodGlucoseMeasurements'
import * as bloodGlucoseMeasurementsAndTreatmentPlans from './bloodGlucoseMeasurementsAndTreatmentPlans'
import * as bloodMeasurementPlans from './bloodMeasurementPlans'
import * as chatMessages from './chatMessages'
import * as diet from './diet'
import * as fetchOrCreateNeedleChatRoom from './fetchOrCreateNeedleChatRoom'
import * as footAssessment from './footAssessment'
import * as footAssessments from './footAssessments'
import * as professionalLogin from './healthCareProfessional'
import * as laboratoryExamination from './laboratoryExamination'
import * as outreachs from './outreachs'
import * as patients from './patients'
import * as photos from './photos'
import * as sentences from './sentences'
import * as sms from './sms'
import * as statistics from './statistics'
import * as treatmentPlan from './treatmentPlan'
import * as treatmentState from './treatmentState'
import * as treatmentStateApp from './treatmentStateApp'
import * as treatmentStates from './treatmentStates'
import * as getPressureHistory from './getPressureHistoy'

import { logQueryOrMutation } from '../utils'
import * as evaluate from './evaluate'
import * as getClinicalLabResult from './getClinicalLabResult'
import * as warningsOfHigh from './warningsOfHigh'
import * as warningsOfLow from './warningsOfLow'

import * as appointments from './appointments'
import * as certifiedDiabetesEducator from './certifiedDiabetesEducator'
import * as cdeForDuty from './cdeForDuty'
import * as healthCareTeam from './healthCareTeam'
import * as orders from './orders'
import * as nowDate from './statistics/getNowDate'
import * as outpatients from './outpatients'
import * as terribleMeasure from './terribleMeasure'

import * as getDiagnoseType from './getDiagnoseType'
import * as getDiagnosticWords from './getDiagnosticWords'
import * as getDiagnoseTypeNew from './getDiagnoseTypeNew'
import * as getDiagnosticWordsNew from './getDiagnosticWordsNew'
import * as getOrderReceiverInfo from './getOrderReceiverInfo'
import * as getPatientInstitution from './getPatientInstitution'
import * as getUserUseBg1Situation from './getUserUseBg1Situation'
import * as blogs from './blogs'
import * as getFoodRecords from './getFoodRecords'

import * as getAlipay from './getAlipay'
import * as getInterventionTasks from './getInterventionTasks'
import * as getTaskSoapCorpus from './getTaskSoapCorpus'
import * as getTaskSoap from './getTaskSoap'
import * as getGoods from './getGoods'
import { logandAuthForApp } from '../utils/authentication'

import * as getUnreadFoodBadges from './getUnreadFoodBadges'
import * as session from './session'
import * as getUnreadTask from './getUnreadTask'
import * as assessments from './assessments'
import * as tags from './tags'
import * as cdeDutyAdjective from './cdeDutyAdjective'
import * as cdeDutyPeopleperDay from './cdeDutyPeopleperDay'

import * as getShoppingCartGoods from './getShoppingCartGoods'

import * as getOutpatientModules from './getOutpatientModules'
import * as getPublicityActivityController from './getPublicityActivity'
import * as getHospitalMessage from './getHospitalMessage'

//AI
import * as queryAIContentTypes from './queryAIContentTypes'
import * as getQAList from './getQAList'
import * as fetchChatSnapshots from './fetchChatSnapshots'
import * as aiCall from './aiCall'
import * as getTakeMedicineList from './getTakeMedicineList'
import * as getCheckByTreatmentId from './getCheckByTreatmentId'
import * as configurationContent from './configurationContent'

import * as outpatientPlan from './outpatientPlan'
import * as disease from './disease'

import { themes } from './themes'

const queries = {
  ...bloodGlucoseMeasurements,
  ...chatMessages,
  ...footAssessment,
  ...footAssessments,
  ...patients,
  ...photos,
  ...statistics,
  ...treatmentState,
  ...treatmentStates,
  ...treatmentStateApp,
  ...sms,
  ...treatmentPlan,
  ...fetchOrCreateNeedleChatRoom,
  ...bloodGlucoseMeasurementsAndTreatmentPlans,
  ...outreachs,
  ...diet,
  ...professionalLogin,
  ...sentences,
  ...laboratoryExamination,
  ...warningsOfLow,
  ...warningsOfHigh,
  ...getClinicalLabResult,
  ...terribleMeasure,
  ...evaluate,
  ...orders,
  ...healthCareTeam,
  ...bloodMeasurementPlans,
  ...getDiagnoseType,
  ...getDiagnosticWords,
  ...getDiagnoseTypeNew,
  ...getDiagnosticWordsNew,
  ...getPatientInstitution,
  ...getUserUseBg1Situation,
  ...getOrderReceiverInfo,
  ...appointments,
  ...outpatients,
  ...certifiedDiabetesEducator,
  ...blogs,
  ...getInterventionTasks,
  ...getTaskSoapCorpus,
  ...getFoodRecords,
  ...getTaskSoap,
  ...getAlipay,
  ...getGoods,
  ...getUnreadFoodBadges,
  ...session,
  ...queryAIContentTypes,
  ...getUnreadTask,
  ...assessments,
  ...tags,
  ...cdeForDuty,
  ...cdeDutyAdjective,
  ...cdeDutyPeopleperDay,
  ...getQAList,
  ...fetchChatSnapshots,
  ...aiCall,
  ...getPressureHistory,
  ...getTakeMedicineList,
  ...getCheckByTreatmentId,
  ...getShoppingCartGoods,
  ...nowDate,
  ...getOutpatientModules,
  ...getPublicityActivityController,
  ...configurationContent,
  ...outpatientPlan,
  ...disease,
  themes,
  ...getHospitalMessage,
}

const queriesWithAuthandLog = {}

Object.keys(queries).map(
  queryName =>
    (queriesWithAuthandLog[queryName] = logandAuthForApp(
      'QUERY',
      queryName,
      queries[queryName],
    )),
)

export default queriesWithAuthandLog
