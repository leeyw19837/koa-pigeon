import * as bloodGlucoseMeasurements from './bloodGlucoseMeasurements'
import * as chatMessages from './chatMessages'
import * as fetchOrCreateNeedleChatRoom from './fetchOrCreateNeedleChatRoom'
import * as footAssessment from './footAssessment'
import * as footAssessments from './footAssessments'
import * as patients from './patients'
import * as photos from './photos'
import * as sms from './sms'
import * as statistics from './statistics'
import * as treatmentPlan from './treatmentPlan'
import * as treatmentState from './treatmentState'
import * as treatmentStates from './treatmentStates'
import * as treatmentStateApp from './treatmentStateApp'
import * as bloodGlucoseMeasurementsAndTreatmentPlans from './bloodGlucoseMeasurementsAndTreatmentPlans'
import * as outreachs from './outreachs'
import * as diet from './diet'
import * as professionalLogin from './healthCareProfessional'
import * as laboratoryExamination from './LaboratoryExamination'


import { logQueryOrMutation } from '../utils'

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
  ...laboratoryExamination,
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
