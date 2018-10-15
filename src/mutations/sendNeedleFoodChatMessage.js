import { pubsub } from '../pubsub'

export const sendNeedleFoodChatMessage = async (_, args, { getDb }) => {
  const db = getDb === undefined ? global.db : await getDb()
  console.log('------args,',args)
  await db.collection('needleChatMessages').insertOne({...args})
  if(args.sourceType === 'FROM_CHAT_SCREEN' || args.sourceType === 'FROM_WEB_CDE_SCORES_ONLY' || args.sourceType === 'FROM_WEB_CDE_SCORES_AND_COMMENTS'){
    pubsub.publish('chatMessageAdded', { chatMessageAdded: args })
  }
  return args
}
