import * as bloodGlucoseMeasurements from './bloodGlucoseMeasurements'
import * as chatMessages from './chatMessages'
import * as footAssessment from './footAssessment'
import * as footAssessments from './footAssessments'
import * as patients from './patients'
import * as photos from './photos'
import * as statistics from './statistics'
import * as treatmentState from './treatmentState'
import * as treatmentStates from './treatmentStates'
import * as treatmentPlan from './treatmentPlan'

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
  ...treatmentPlan,
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
