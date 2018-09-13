import { ObjectID } from 'mongodb'
export const tags = async (_, args, context) => {
  const a = {
    _id: new ObjectID().toString(),
    title: '饮食',
    parentId: '',
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const b = {
    _id: new ObjectID().toString(),
    title: '运动',
    parentId: '',
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }

  const aa = {
    _id: new ObjectID().toString(),
    title: '饮食不均衡',
    parentId: a._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const bb = {
    _id: new ObjectID().toString(),
    title: '加餐不合理',
    parentId: a._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }

  const cc = {
    _id: new ObjectID().toString(),
    title: '蛋白质摄入少',
    parentId: aa._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const dd = {
    _id: new ObjectID().toString(),
    title: '蛋白质摄入多',
    parentId: aa._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const ee = {
    _id: new ObjectID().toString(),
    title: '加餐时机太早',
    parentId: bb._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const ff = {
    _id: new ObjectID().toString(),
    title: '加餐的食物太多',
    parentId: bb._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const gg = {
    _id: new ObjectID().toString(),
    title: '跑步公里太长',
    parentId: b._id,
    operator: '66728d10dc75bc6a43052036',
    status: 'ACTIVE',
    createdAt: new Date(),
  }
  const insertContents = [a, b, aa, bb, cc, dd, ee, ff, gg]

  const tags = await db
    .collection('tags')
    .find({
      status: 'ACTIVE',
    })
    .sort({ createdAt: -1 })
    .toArray()

  if (!tags.length) {
    await db.collection('tags').insert(insertContents)
  }
  return tags
}
