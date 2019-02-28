import flattenDeep from 'lodash/flattenDeep'
import get from 'lodash/get'
import { request } from 'graphql-request'
const { BLOG_URL = 'http://172.16.0.69:3181/graphql' } = process.env

const QUERY_MAP = {
  getCategoryArticles: `query GetCategoryArticles($category: String, $systemType: String) {
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
  }`,
  getArticlesByCategory: `query GetArticlesByCategory($category: String, $systemType: String, $cursorInput: PaginationCursorInput) {
    getArticlesByCategory(category: $category,systemType: $systemType, cursorInput: $cursorInput) {
      pageCursor {
        after
        hasNextPage
      }
      articles {
        _id
        title
        views
        comments
        publishedAt
      }
    }
  }`,
}

const getDataWithSharing = async (queryKey, params) => {
  let result = []
  try {
    const data = await request(BLOG_URL, QUERY_MAP[queryKey], params)
    result = data[queryKey]
  } catch (error) {
    console.log(error, 'error')
  }
  if (queryKey === 'getArticlesByCategory') {
    result = [result]
  }
  const articleIds = []
  result.forEach(item => {
    const articles = item.articles || []
    articleIds.push(articles.map(o => o._id))
  })
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
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
    }))
    return {
      ...categoryItem,
      articles,
    }
  })
}

export const getCategoryArticles = async _ => {
  const params = {
    systemType: 'BG',
  }
  const result = await getDataWithSharing('getCategoryArticles', params)
  return result
}

export const getArticlesByCategory = async (_, { category, cursorInput }) => {
  const params = {
    systemType: 'BG',
    category,
    cursorInput,
  }
  const result = await getDataWithSharing('getArticlesByCategory', params)
  console.log('result', '~~~~~', result)
  return result[0]
}
