import flattenDeep from 'lodash/flattenDeep'
import get from 'lodash/get'
import { request } from 'graphql-request'
const { BLOG_URL = 'http://172.16.0.69:3181/graphql' } = process.env

export const getCategoryArticles = async (_, { category }, { getDb }) => {
  const query = `query GetCategoryArticles($category: String, $systemType: String) {
    getCategoryArticles(category: $category,systemType: $systemType) {
      dayUpdateCount
      category
      articles {
        _id
        title
        views
        comments
      }
    }
  }`

  let result = []
  try {
    const data = await request(BLOG_URL, query, {
      systemType: 'BG',
    })
    result = data.getCategoryArticles
  } catch (error) {
    console.log(error, 'error')
  }
  const articleIds = []
  result.forEach(item => {
    const articles = item.articles || []
    articleIds.push(articles.map(o => o._id))
  })
  const db = await getDb()
  const sharingInfo = await db
    .collection('sharing')
    .aggregate([
      { $match: { 'shareData.recordId': { $in: flattenDeep(articleIds) } } },
      { $group: { _id: '$shareData.recordId', count: { $sum: 1 } } },
    ])
    .toArray()
  return result.map(categoryItem => {
    let { articles } = categoryItem
    articles = articles.map(article => ({
      ...article,
      sharings:
        get(sharingInfo.filter(o => o._id === article._id), '0.count') || 0,
    }))
    return {
      ...categoryItem,
      articles,
    }
  })
}
