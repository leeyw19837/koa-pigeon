import assessmentTimes from './assessmentTimes'
import footAssessment from './footAssessment'
import photos from './photos'
import signingInAndOut from './signingInAndOut'

export default {
  ...footAssessment,
  ...photos,
  ...signingInAndOut,
  ...assessmentTimes,
}
