export const getQAList = async (_, args, { getDb }) => {
  const db = await getDb()
  let condition = {}
  switch (args.approved) {
    case 0:
      condition = { createdAt: 1 }
      break
    case 1:
      condition = { createdAt: -1 }
      break
  }
  let { pageSize, pageIndex } = args
  pageIndex < 1 ? (pageIndex = 1) : (pageIndex = pageIndex)

  let recordsCount = await db
    .collection('aiChatQA')
    .count({ approved: args.approved })
  recordsCount < 1 ? (recordsCount = 1) : (recordsCount = recordsCount)

  const totalPage = Math.ceil(recordsCount / pageSize)
  pageIndex = totalPage < pageIndex ? totalPage : pageIndex

  const records = await db
    .collection('aiChatQA')
    .find({
      approved: args.approved,
    })
    .sort(condition)
    .skip((pageIndex - 1) * pageSize) // 忽略前n页
    .limit(pageSize) // 拿pageSize条数
    .toArray()

  return {
    recordsCount,
    totalPage,
    pageIndex,
    pageSize,
    records,
  }
}
