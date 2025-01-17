import flattenDeep from 'lodash/flattenDeep'
import get from 'lodash/get'
import includes from 'lodash/includes'
import { request } from 'graphql-request'
import { ObjectID } from 'mongodb'
const { BLOG_URL = 'https://blog-backend.gtzh-stg.ihealthcn.com/graphql' } = process.env

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
        avatar
      }
    }
  }`,
  getArticlesByCategory: `query GetArticlesByCategory($category: String, $systemType: String, $cursorInput: PaginationCursorInput) {
    getArticlesByCategory(category: $category,systemType: $systemType, cursorInput: $cursorInput) {
      pageInfo {
        first
        after
        hasNextPage
      }
      articles {
        _id
        title
        views
        comments
        publishedAt
        avatar
      }
    }
  }`,
  getArticleById: `query GetArticleById($systemType: String, $id: ID!) {
    getArticleById(systemType: $systemType, id: $id) {
      _id
      title
      views
      comments
      publishedAt
      avatar
      avatarThumbnail
      desc
      category
    }
  }`,
  getAuthor: `
    query getAuthor( $authorId: ID!) {
      getAuthor(authorId: $authorId) {
        _id
        nickname
        institution
        avatar
        intro
        achievements
        articles {
          _id
          title
          views
          comments
        }
      }
    }
  `,
  getArticlesByIds: `query getArticlesByIds($systemType: String, $ids:[String]) {
    getArticlesByIdArray(systemType: $systemType, ids: $ids) {
      _id
      title
      views
      comments
      publishedAt
      avatar
      avatarThumbnail
      desc
      category
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
  return result[0]
}

export const getArticleById = async (_, { systemType = 'BG', id }) => {
  let result = null
  try {
    const data = await request(BLOG_URL, QUERY_MAP['getArticleById'], {
      systemType,
      id,
    })
    result = data['getArticleById']
  } catch (error) {
    console.log(error, 'error')
  }
  if (result) {
    const sharingInfo = await db
      .collection('sharing')
      .aggregate([
        { $match: { 'shareData.recordId': result._id } },
        { $group: { _id: '$shareData.recordId', count: { $sum: 1 } } },
      ])
      .toArray()
    result = {
      ...result,
      sharings:
        get(sharingInfo.filter(o => o._id === result._id), '0.count') || 0,
      publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
    }
  }
  console.log('result :', result)
  return result
}

export const getAuthor = async (_, { authorId }) => {
  let author = null
  try {
    const data = await request(BLOG_URL, QUERY_MAP['getAuthor'], {
      authorId,
    })
    author = data['getAuthor']
  } catch (error) {
    console.log(error, 'error')
  }
  if (author && author.articles) {
    const articleIds = author.articles.map(a => a._id)
    const sharingInfo = await db
      .collection('sharing')
      .aggregate([
        { $match: { 'shareData.recordId': { $in: articleIds } } },
        { $group: { _id: '$shareData.recordId', count: { $sum: 1 } } },
      ])
      .toArray()

    author.articles = author.articles.map(article => ({
      ...article,
      sharings:
        get(sharingInfo.filter(o => o._id === article._id), '0.count') || 0,
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
    }))
  }
  return author
}

export const ArticleCollection = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, knowledgeId } = args
  const user = await db
    .collection('users')
    .findOne({ _id: ObjectID(patientId) })
  if (!user) {
    throw new Error('验证码不正确')
  }
  let collectionList = user.knowledgeList
  return includes(collectionList, knowledgeId)
}

export const getBlogsByIdArray = async (_, args, context) => {
  let result = null
  const ids = _.ids
  if (!ids) {
    return []
  }
  try {
    const data = await request(BLOG_URL, QUERY_MAP['getArticlesByIds'], {
      systemType: 'BG',
      ids,
    })
    result = data.getArticlesByIdArray
  } catch (error) {
    console.log(error, 'error')
  }
  if (result && result.length > 0) {
    for (var i = 0; i < result.length; i++) {
      const sharingInfo = await db
        .collection('sharing')
        .aggregate([
          { $match: { 'shareData.recordId': result[i]._id } },
          { $group: { _id: '$shareData.recordId', count: { $sum: 1 } } },
        ])
        .toArray()
      result[i].sharings = get(sharingInfo.filter(o => o._id === result[i]._id), '0.count') || 0
      result[i].publishedAt = result[i].publishedAt ? new Date(result[i].publishedAt) : null
    }
    return result
  }
}