import { ObjectId } from 'mongodb'
import freshId from 'fresh-id'

export const blogs = async (_, args, context) => {
  const db = await context.getDb()
  const { blogId } = args
  const cursor = {}
  if (blogId) cursor['_id'] = blogId
  // const content = {
  //   _id: freshId(),
  //   type: 'VIDEO',
  //   avatar: '',
  //   title: '李昂的第一节课',
  //   content: [
  //     '时隔20年，在这个夏天，老爸的舌头终于再次尝到了西瓜的甜——我很想把这句话写得更矫情一点，因为那样才能表达老爸连续5周血糖正常带给我们一家人的欣快。自从20年前老爸查出严重糖尿病后，一向自律的他就再也没有吃过甜的东西，准确的说，舔都没有舔过。',
  //     '继续这个故事，得先申明一下：这不是一个医学案例报告，也不是一个临床心理学案例报告，我只是陈述一个故事。这个故事里同时发生了两件事情，其一是父亲的糖尿病症状好转了，其二是父亲的心理状况变好了。虽然我一直认为2型糖尿病是一个心身疾病，但是，本文并不证明任何因果性或必然性。',
  //   ],
  //   videoSources: ['https://media.w3.org/2010/05/sintel/trailer_hd.mp4'],
  //   author: '李昂',
  //   comments: [
  //     {
  //       text: '不错',
  //       userId: '5a45a32a638f630001e01153',
  //       votes: [1, 2, 3],
  //       createdAt: new Date(),
  //     },
  //     {
  //       text: '真不错',
  //       userId: '5a45a32a638f630001e01153',
  //       votes: [1, 3],
  //       createdAt: new Date(),
  //     },
  //   ],
  //   votes: [1, 2, 3],
  //   views: [1, 1, 1, 2, 2, 2, 3],
  //   createdAt: new Date(),
  //   publishedAt: new Date(),
  // }
  // const result = await db.collection('blogs').insert(content)
  // console.log(result, '@AAA')
  const blogs = await db
    .collection('blogs')
    .find(cursor)
    .sort({ publishedAt: -1 })
    .toArray()

  return blogs
}
