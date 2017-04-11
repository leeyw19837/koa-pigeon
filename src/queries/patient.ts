import { ObjectID } from 'mongodb'


export default async (_, args, { db }) => {
  return db
    .collection('users')
    .findOne({ _id: ObjectID.createFromHexString(args.id) })
}
