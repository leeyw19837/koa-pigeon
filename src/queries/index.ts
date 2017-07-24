import * as chatMessages from './chatMessages'
import * as footAssessment from './footAssessment'
import * as footAssessments from './footAssessments'
import * as photos from './photos'
import * as statistics from './statistics'
import * as treatmentState from './treatmentState'
import * as treatmentStates from './treatmentStates'
import * as sms from './sms'

import { logQueryOrMutation } from '../utils'


const queries = {
  ...chatMessages,
  ...footAssessment,
  ...footAssessments,
  ...photos,
  ...statistics,
  ...treatmentState,
  ...treatmentStates,
  ...sms
}

const queriesWithLogging = {}
Object.keys(queries).map((queryName: string) =>
  queriesWithLogging[queryName] = logQueryOrMutation('QUERY', queryName, queries[queryName]),
)

export default queriesWithLogging
