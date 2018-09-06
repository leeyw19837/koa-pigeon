import { retrain } from '../modules/AI'

export const updateContentType = async (_, args, context) => {
  const db = await context.getDb()
  const { messageId, contentType } = args
  await db.collection('needleChatMessages').update(
    {
      _id: messageId,
    },
    {
      $set: {
        contentType,
        approved: true,
      },
    },
  )

  const message = await db.collection('needleChatMessages').findOne({
    _id: messageId,
  })

  console.log(
    `re-train message type of ${messageId} the result is ${await retrain(
      message.text,
      contentType,
    )}`,
  )
  return message
}
