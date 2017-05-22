import { Db } from 'mongodb'


export const photos = async (_, args, { db }: { db: Db }) => db
  .collection('photos')
  .find({ patientId: args.patientId, owner: args.owner })
  .toArray()
