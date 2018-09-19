import { ObjectID } from 'mongodb'
const moment = require('moment')

export const updateTag = async (_, params, context) => {
  const { type, tagId, title, parentId, operator } = params
  let tempTagIds = [tagId]
  if (/delete|modify/g.test(type)) {
    const $setObj = {
      updatedAt: new Date(),
    }
    if (type === 'modify') {
      $setObj.title = title
    } else {
      const dbTags = await db
        .collection('tags')
        .find({
          status: 'ACTIVE',
        })
        .toArray()

      const aa = dbTags.filter(o => o.parentId === tagId)
      aa.forEach(aItem => {
        const { _id } = aItem
        const bb = dbTags.filter(b => b.parentId === _id)
        if (bb.length) {
        }
      })
      // get the parentIds
      const tagListIds = []
      const getParentIds = (tagId, dbTags) => {
        if (tagListIds.indexOf(tagId) === -1) {
          tagListIds.push(tagId)
        }
        const children = dbTags.filter(tag => tag.parentId === tagId)
        if (children.length) {
          children.forEach(o => {
            getParentIds(o._id, dbTags)
          })
        }
      }

      getParentIds(tagId, dbTags)
      tempTagIds = tagListIds
      $setObj.status = 'DELETED'
    }
    await db.collection('tags').update(
      {
        _id: { $in: tempTagIds },
      },
      {
        $set: $setObj,
      },
      { multi: true },
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
