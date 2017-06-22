import { IContext } from '../types'


export const photos = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  return db
    .collection('photos')
    .find({ patientId: args.patientId, owner: args.owner })
    .toArray()
}
