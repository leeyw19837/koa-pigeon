import { ObjectID } from 'mongodb'

export const Assessment = {
  tags: async (assessment, _, { getDb }) => {
    const db = await getDb()
    const { tags } = assessment
    const dbTags = await db
      .collection('tags')
      .find({
        status: 'ACTIVE',
        _id: { $in: tags },
      })
      .toArray()
    return dbTags
  },
  tagListIds: async (assessment, _, { getDb }) => {
    const db = await getDb()
    const { tags } = assessment
    const dbTags = await db
      .collection('tags')
      .find({
        status: 'ACTIVE',
      })
      .toArray()
    // get the parentIds
    const tagListIds = []
    const getParentIds = (tagId, dbTags) => {
      const currentTag = dbTags.filter(tag => tag._id === tagId)[0]
      if (tagListIds.indexOf(currentTag._id) === -1) {
        tagListIds.push(currentTag._id)
      }
      if (currentTag.parentId) {
        getParentIds(currentTag.parentId, dbTags)
      }
    }
    tags.filter(tagId => {
      getParentIds(tagId, dbTags)
    })
    return tagListIds
  },
}
