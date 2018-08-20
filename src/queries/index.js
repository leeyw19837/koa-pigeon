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

import { logQueryOrMutation } from '../utils'
import * as evaluate from './evaluate'
import * as getClinicalLabResult from './getClinicalLabResult'
import * as warningsOfHigh from './warningsOfHigh'
import * as warningsOfLow from './warningsOfLow'

import * as appointments from './appointments'
import * as certifiedDiabetesEducator from './certifiedDiabetesEducator'
import * as healthCareTeam from './healthCareTeam'
import * as orders from './orders'
import * as outpatients from './outpatients'
import * as terribleMeasure from './terribleMeasure'

import * as getDiagnoseType from './getDiagnoseType'
import * as getDiagnosticWords from './getDiagnosticWords'
import * as getDiagnoseTypeNew from './getDiagnoseTypeNew'
import * as getDiagnosticWordsNew from './getDiagnosticWordsNew'
import * as getOrderReceiverInfo from './getOrderReceiverInfo'
import * as getPatientInstitution from './getPatientInstitution'
import * as getUserUseBg1Situation from './getUserUseBg1Situation'
import { blogs } from './blogs'
import * as getFoodRecords from './getFoodRecords'

import * as getAlipay from './getAlipay'
import * as getInterventionTasks from './getInterventionTasks'
import * as getTaskSoapCorpus from './getTaskSoapCorpus'
import * as getTaskSoap from './getTaskSoap'
import * as getGoods from './getGoods'
import * as achievement from './achievement'
import { authForApp } from '../utils/authentication'

import * as getUnreadFoodBadges from './getUnreadFoodBadges'

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
  blogs,
  ...getInterventionTasks,
  ...getTaskSoapCorpus,
  ...getFoodRecords,
  ...getTaskSoap,
  ...getAlipay,
  ...getGoods,
  ...achievement,
  ...getUnreadFoodBadges,
}

const queriesWithLogging = {}
const queriesWithAuth = {}

Object.keys(queries).map(
  queryName =>
    (queriesWithLogging[queryName] = logQueryOrMutation(
      'QUERY',
      queryName,
      queries[queryName],
    )),
)

Object.keys(queriesWithLogging).map(
  queryName =>
    (queriesWithAuth[queryName] = authForApp(
      'QUERY',
      queryName,
      queries[queryName],
    )),
)

export default queriesWithAuth
