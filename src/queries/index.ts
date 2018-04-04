import * as bloodMeasurementPlans from './bloodMeasurementPlans'
import * as bloodGlucoseMeasurements from './bloodGlucoseMeasurements'
import * as bloodGlucoseMeasurementsAndTreatmentPlans from './bloodGlucoseMeasurementsAndTreatmentPlans'
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

import * as orders from './orders'
import * as terribleMeasure from './terribleMeasure'
import * as healthCareTeam from './healthCareTeam'

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
}

const queriesWithLogging = {}
Object.keys(queries).map(
  (queryName: string) =>
    (queriesWithLogging[queryName] = logQueryOrMutation(
      'QUERY',
      queryName,
      queries[queryName],
    )),
)

export default queriesWithLogging
