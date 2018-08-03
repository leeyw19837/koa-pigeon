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
      content
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

  const data = await request(BLOG_URL, query, {
    systemType: 'BG',
  })
  // const db = await context.getDb()
  // const { blogId } = args
  // const cursor = {}
  // if (blogId) cursor['_id'] = blogId
  // const blogs = await db
  //   .collection('blogs')
  //   .find(cursor)
  //   .sort({ publishedAt: -1 })
  //   .toArray()

  return data.getBlogsBySystemType
}
