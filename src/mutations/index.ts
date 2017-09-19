import * as assessmentTime from './assessmentTime'
import * as bloodGlucoseMeasurement from './bloodGlucoseMeasurement'
import * as chatMessages from './chatMessages'
import * as footAssessment from './footAssessment'
import * as photos from './photos'
import * as sendNeedleAudioChatMessage from './sendNeedleAudioChatMessage'
import * as sendNeedleImageChatMessage from './sendNeedleImageChatMessage'
import * as sendNeedleTextChatMessage from './sendNeedleTextChatMessage'

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
