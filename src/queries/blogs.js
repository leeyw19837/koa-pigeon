import { ObjectId } from 'mongodb'
import freshId from 'fresh-id'
import { request } from 'graphql-request'
const {
  BLOG_URL = 'https://blog-backend.gtzh-stg.ihealthcn.com/graphql',
} = process.env

export const blogs = async (_, args, context) => {
  const query = `query GetBlogsBySystemType($systemType: String!) {
    getBlogsBySystemType(systemType: $systemType) {
      _id
      title
      type
      avatar
      avatarThumbnail
      content
      desc
      author
      publishedAt
      videoSources
      comments(systemType: $systemType) {
        _id
        content
        user {
          nickname
          avatar
        }
        votes
        createdAt
      }
      votes(systemType: $systemType)
      views(systemType: $systemType)
    }
  }`
  let result = []
  try {
    const data = await request(BLOG_URL, query, {
      systemType: 'BG',
    })
    result = data.getBlogsBySystemType
  } catch (error) {
    console.log(error, 'error')
  }
  result = result.map(blog => {
    const { comments } = blog
    let tempCms = []
    if (comments.length) {
      tempCms = comments.map(cm => ({
        ...cm,
        text: cm.content,
        createdAt: new Date(cm.createdAt),
      }))
    }
    return {
      ...blog,
      comments: tempCms,
      publishedAt: new Date(blog.publishedAt),
      createdAt: new Date(blog.publishedAt),
    }
  })

  return result
}

export const getBlogsPagination = async (_, args, context) => {
  const query = `query GetBlogsBySystemTypePagination($systemType: String!, $count: Int!, $index: Int!) {
    getBlogsBySystemTypePagination(systemType: $systemType, count: $count, index: $index) {
      _id
      title
      type
      avatar
      avatarThumbnail
      content
      desc
      author
      publishedAt
      videoSources
      comments(systemType: $systemType) {
        _id
        content
        user {
          nickname
          avatar
        }
        votes
        createdAt
      }
      votes(systemType: $systemType)
      views(systemType: $systemType)
    }
  }`

  const queryBlogTotalNumber = `query GetBlogsTotalNumber($systemType: String!) {
    getBlogsTotalNumber(systemType: $systemType)
  }`
  let result = []
  let dataTotalNumber = 0
  try {
    const data = await request(BLOG_URL, query, {
      systemType: 'BG',
      count: args.count,
      index: args.index,
    })
    result = data.getBlogsBySystemTypePagination
    const totalNumberResult = await request(BLOG_URL, queryBlogTotalNumber, {
      systemType: 'BG',
    })
    dataTotalNumber = totalNumberResult.getBlogsTotalNumber
    console.log('====dataTotalNumber====', dataTotalNumber)
  } catch (error) {
    console.log(error, 'error')
  }
  result = result.map(blog => {
    const { comments } = blog
    let tempCms = []
    if (comments.length) {
      tempCms = comments.map(cm => ({
        ...cm,
        text: cm.content,
        createdAt: new Date(cm.createdAt),
      }))
    }
    return {
      ...blog,
      comments: tempCms,
      publishedAt: new Date(blog.publishedAt),
      createdAt: new Date(blog.publishedAt),
      totalCount: dataTotalNumber,
    }
  })

  // console.log('result=', result)

  return result
}

export const blogById = async (_, args, context) => {
  const query = `query GetBlogDetail($_id: String!) {
    getBlogDetail(_id: $_id) {
      _id
      title
      avatar
      avatarThumbnail
      content
      desc
    }
  }`
  const { _id } = args
  let result
  try {
    const data = await request(BLOG_URL, query, {
      _id,
    })
    result = data.getBlogDetail
  } catch (error) {
    console.log(error, 'error')
  }
  console.log(result, 'result')
  return result
}

export const getBlogsByIdArray = async (_, args, context) => {
  const query = `query getBlogsByIdArray($systemType: String!,$ids:[String]) {
    getBlogsByIdArray(systemType: $systemType, ids:$ids) {
      _id
      title
      type
      avatar
      avatarThumbnail
      desc
      publishedAt
      videoSources
      comments(systemType: $systemType) {
        _id
        content
        user {
          nickname
          avatar
        }
        votes
        createdAt
      }
      votes(systemType: $systemType)
      views(systemType: $systemType)
    }
  }`
  const { ids } = _
  let result = []
  try {
    const data = await request(BLOG_URL, query, {
      systemType: 'BG',
      ids
    })
    result = data.getBlogsByIdArray
  } catch (error) {
    console.log(error, 'error')
  }
  result = result.map(blog => {
    const { comments } = blog
    let tempCms = []
    if (comments.length) {
      tempCms = comments.map(cm => ({
        ...cm,
        text: cm.content,
        createdAt: new Date(cm.createdAt),
      }))
    }
    return {
      ...blog,
      comments: tempCms,
      publishedAt: new Date(blog.publishedAt),
      createdAt: new Date(blog.publishedAt),
    }
  })
  return result
}
