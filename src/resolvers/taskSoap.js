import map from 'lodash/map'
import find from 'lodash/find'

export const TaskSoap = {
  plans: async (soap, _, { getDb }) => {
    const db = await getDb()
    let plans = soap.plans
    const assessmentIds = map(plans, p => p.assessmentId)
    const assessments = await db
      .collection('assessments')
      .find({ _id: { $in: assessmentIds } })
      .toArray()
    plans = map(plans, p => {
      const assessment = find(assessments, { _id: p.assessmentId })
      return { content: p.content, assessment }
    })
    return plans
  },
}
