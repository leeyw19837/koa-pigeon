import events from './events'
import footAssessment from './footAssessment'
import photos from './photos'
import signingInAndOut from './signingInAndOut'

export default {
  ...events,
  ...footAssessment,
  ...photos,
  ...signingInAndOut,
}
