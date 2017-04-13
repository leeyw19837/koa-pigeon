import { Db } from 'mongodb'

export default async (_, args, { db }: { db: Db }) => db
  .collection('photos')
  .find({ patientId: args.patientId, owner: args.owner })
  .toArray()
