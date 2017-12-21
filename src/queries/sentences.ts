import { IContext } from '../types'

export const sentences = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  const { usedFor, authors } = args
  const query: any = {}
  if(usedFor) query.userdFor = usedFor
  if(authors) query.author = { $in: authors }
  return await db.collection('sentences').find(query).toArray()
}
