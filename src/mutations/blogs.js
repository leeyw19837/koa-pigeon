import freshId from 'fresh-id'
const moment = require('moment')

export const updateBlogByType = async (_, {
  blogId,
  batchData,
  type,
  patientId
}, context) => {
  const db = await context.getDb()
  const {
    value,
    status
  } = batchData
  let setObj = {}
  if (type === 'comments') {
    setObj = {
      _id: freshId(),
      text: value,
      userId: patientId,
      votes: [],
      createdAt: new Date()
    }
  } else if (/votes|views/g.test(type)) {
    setObj[type] = patientId
  } else if (type === 'voteComment') {
    const key = `comments.${ + value}.votes`
    setObj[key] = patientId
  }
  const cursorKey = status !== 'add' ?
    '$pull' :
    '$push'

  console.log('cursorKey', cursorKey, setObj)
  const rst = await db
    .collection('blogs')
    .update({
      _id: blogId
    }, {
      [cursorKey]: setObj,
      $set: {
        updatedAt: new Date()
      }
    }, )
  return !!rst.ok
}