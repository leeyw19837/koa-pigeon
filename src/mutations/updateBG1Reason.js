import { ObjectID } from 'mongodb'


export const updateBG1Reason = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, reason } = args
  const reasonValue = reason.length > 0 ? reason : null
  console.log(args)
  //   await db.collection('users').update(
  //     {
  //       _id: ObjectID.createFromHexString(patientId),
  //     },
  //     {
  //       $set: {
  //         notUseBg1Reason: reasonValue,
  //       },
  //     },
  //   )
  return db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId),
    },
    {
      $set: {
        notUseBg1Reason: reasonValue,
      },
    },
  )
}
