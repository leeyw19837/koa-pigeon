export const assessments = async (_, args, context) => {
  const { selectedTags, searchValue = '' } = args
  const cursor = {
    status: 'ACTIVE',
  }
  if (selectedTags && selectedTags.length) {
    cursor.tags = {
      $in: ['3'],
    }
  }
  const assessments = await db
    .collection('assessments')
    .find(cursor)
    .sort({ createdAt: -1 })
    .toArray()
  let result = assessments || []
  const searchWords = searchValue.split(' ').filter(o => o)
  if (searchWords.length) {
    result = assessments.filter(o => {
      const value = o.value
      return !!searchWords.filter(word => value.indexOf(word) !== -1).length
    })
  }
  return result
}
