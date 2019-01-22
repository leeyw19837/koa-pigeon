import { ObjectId } from 'mongodb'
import freshId from 'fresh-id'
import { request } from 'graphql-request'
const {
  BLOG_URL = 'https://blog-backend.gtzh-stg.ihealthcn.com/graphql',
} = process.env

export const themes = async (_, args, context) => {
  const query = `query GetThemesBySystemType($systemType: String!) {
    getThemesBySystemType(systemType: $systemType) {
      _id
      type
      banner
      title
      desc
    }
  }`
  let result = []
  try {
    const data = await request(BLOG_URL, query, {
      systemType: 'BG',
    })
    result = data.getThemesBySystemType
  } catch (error) {
    console.log(error, 'error')
  }
// console.log(result, '-=-=')
  // result = result.map(theme => {
  //   return {
  //     ...theme,
  //     // comments: tempCms,
  //     // publishedAt: new Date(theme.publishedAt),
  //     // createdAt: new Date(theme.publishedAt),
  //   }
  // })

console.log(result, '++++')
  return result
}
