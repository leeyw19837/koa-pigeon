export default async (_, args, { db }) => db
  .collection('photos')
  .find({ patientId: args.patientId, owner: args.owner }).toArray()
