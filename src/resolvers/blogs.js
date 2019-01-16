import { ObjectID } from 'mongodb'

export const Blog = {
  comments: async (blog, _, { getDb }) => {
    const db = await getDb()
    const { comments } = blog
    const transforComment = []
    if (comments && comments.length) {
      const users = await db
        .collection('users')
        .find({
          _id: { $in: comments.map(o => ObjectID(o.userId)) },
        })
        .toArray()
      comments.forEach(comment => {
        const { text, votes, createdAt, userId } = comment
        const user = users.filter(o => o._id.toString() === userId)[0] || {}
        transforComment.push({
          text,
          user,
          votes,
          createdAt,
        })
      })
    }
    return transforComment
  },
}
