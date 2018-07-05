import freshId from 'fresh-id'
const moment = require('moment')

export const updateBlogByType = async ({
  blogId,
  batchData,
  type,
  patientId,
}) => {
  const { text, status } = batchData
  let setObj = {}
  if (type === 'comments') {
    setObj = {
      _id: freshId(),
      text,
      userId: patientId,
      votes: [],
      createdAt: new Date(),
    }
  } else if (/votes|views/g.test(type)) {
    setObj[type] = patientId
  } else if (type === 'voteComment') {
    const key = `comments.${data}.votes`
    setObj[key] = patientId
  }
  const cursorKey = status !== 'add' ? '$pull' : '$push'
  await db.collection('blogs').update(
    {
      _id: blogId,
    },
    {
      [cursorKey]: setObj,
      $set: {
        updatedAt: new Date(),
      },
    },
  )
}
