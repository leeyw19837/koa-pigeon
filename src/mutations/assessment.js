import { ObjectID } from 'mongodb'
const moment = require('moment')

export const updateAssessment = async (_, params, context) => {
  const { assessmentId, value, tagIds, operator, status } = params
  if (assessmentId === 'adding') {
    await db.collection('assessments').insert({
      _id: new ObjectID().toString(),
      value,
      status: 'ACTIVE',
      tags: tagIds,
      operator: operator || '66728d10dc75bc6a43052036',
      createdAt: new Date(),
    })
  } else {
    let $setObj = {
      value,
      tags: tagIds,
      updatedAt: new Date(),
    }
    if (status && status === 'DELETED') {
      $setObj = {
        status: 'DELETED',
        updatedAt: new Date(),
      }
    }
    await db.collection('assessments').update(
      {
        _id: assessmentId,
      },
      {
        $set: $setObj,
      },
    )
  }
  context.response.set('effect-types', 'Assessment')
}
