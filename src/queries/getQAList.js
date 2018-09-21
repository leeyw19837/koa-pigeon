export const getQAList = async (_, args, { getDb }) => {
  const db = await getDb()
  const condition = {}
  switch (args.approved) {
    case 0:
      condition = { createdAt: 1 }
      break
    case 1:
      condition = { createdAt: -1 }
      break
  }
  const { pageSize, pageIndex } = args

  const recordsCount = await db
    .collection('aiChatQA')
    .count({ approved: args.approved })

  const totalPage = Math.ceil(recordsCount / pageSize)
  pageIndex = totalPage > pageIndex ? totalPage : pageIndex

  const records = await db
    .collection('aiChatQA')
    .find({
      approved: args.approved,
    })
    .sort(condition)
    .skip((pageIndex - 1) * pageSize) // 忽略前n页
    .limit(pageSize)
    .toArray() // 拿pageSize条数

  return {
    totalPage,
    pageIndex,
    pageSize,
    records,
  }
}
