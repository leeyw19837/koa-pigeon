import { ObjectID } from 'mongodb'
export const updateArticleCollection = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, knowledgeId, collectionStatus } = args
  console.log('===!=>', patientId, knowledgeId, collectionStatus)
  if (collectionStatus) {
    const user = await db
      .collection('users')
      .findOne({ _id: ObjectID(patientId) })
    let array = user.knowledgeList || []
    array.push(knowledgeId)
    db.collection('users').update(
      { _id: ObjectID(patientId) },
      { $set: { knowledgeList: array } },
    )
    return true
  } else {
    const user = await db
      .collection('users')
      .findOne({ _id: ObjectID(patientId) })
    let array = user.knowledgeList || []
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
    return true
  }
}
