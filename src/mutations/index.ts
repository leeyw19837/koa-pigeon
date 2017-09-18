import * as assessmentTime from './assessmentTime'
import * as bloodGlucoseMeasurement from './bloodGlucoseMeasurement'
import * as chatMessages from './chatMessages'
import * as footAssessment from './footAssessment'
import * as needleSendAudioChatMessage from './NeedleSendAudioChatMessage'
import * as needleSendImageChatMessage from './NeedleSendImageChatMessage'
import * as needleSendTextChatMessage from './NeedleSendTextChatMessage'
import * as photos from './photos'

import { logQueryOrMutation } from '../utils'

const mutations = {
  ...assessmentTime,
  ...chatMessages,
  ...footAssessment,
  ...photos,
  ...bloodGlucoseMeasurement,
  ...needleSendAudioChatMessage,
  ...needleSendImageChatMessage,
  ...needleSendTextChatMessage,
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
