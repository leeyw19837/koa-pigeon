import { ObjectID } from 'mongodb'
import includes from 'lodash/includes'

export const ArticleCollectionStatus = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, knowledgeId } = args
  console.log('===!=>', patientId, knowledgeId)

  const user = await db
    .collection('users')
    .findOne({ _id: ObjectID(patientId) })
  let array = user.knowledgeList || []
  if (!includes(array, knowledgeId)) {
    array.push(knowledgeId)
    db.collection('users').update(
      { _id: ObjectID(patientId) },
      { $set: { knowledgeList: array } },
    )
    return true
  } else {
    for (var i = 0, flag = true, len = array.length; i < len; flag ? i++ : i) {
      if (array[i] && array[i] === knowledgeId) {
        array.splice(i, 1)
        flag = false
      } else {
        flag = true
      }
      db.collection('users').update(
        { _id: ObjectID(patientId) },
        { $set: { knowledgeList: array } },
      )
    }
    return false
  }
}
