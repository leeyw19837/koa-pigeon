import { ObjectID } from 'mongodb'
const moment = require('moment')

export const updateTag = async (_, params, context) => {
  const { type, tagId, title, parentId, operator } = params
  if (/delete|modify/g.test(type)) {
    const $setObj = {
      updatedAt: new Date(),
    }
    if (type === 'modify') {
      $setObj.title = title
    } else {
      $setObj.status = 'DELETED'
    }
    await db.collection('tags').update(
      {
        _id: tagId,
      },
      {
        $set: $setObj,
      },
    )
  } else if (/add/g.test(type)) {
    await db.collection('tags').insert({
      _id: new ObjectID().toString(),
      title,
      parentId,
      status: 'ACTIVE',
      operator: operator || '66728d10dc75bc6a43052036',
      createdAt: new Date(),
    })
  }
  context.response.set('effect-types', 'Tag')
}
