import assessmentTimes from './assessmentTimes'
import footAssessment from './footAssessment'
import photos from './photos'

export default {
  ...footAssessment,
  ...photos,
  ...assessmentTimes,
}
