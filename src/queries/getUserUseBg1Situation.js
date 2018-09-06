import { ObjectID } from 'mongodb'
export const getUserUseBg1Situation = async (_, args, { getDb }) => {
    console.log('getUserUseBg1Situation called!')
    const db = await getDb()
    let result = {
        useBg1Situation: false
    }

  const user = await db
      .collection('users')
      .find({
          _id:ObjectID.createFromHexString(args.patientId)
      })
      .toArray()

  if (user && user.length > 0) {
    if (user.isUseBg1) {
      if (user.isUseBg1 === true) {
        if (!user.notUseBg1Reason) {
          result.useBg1Situation = true
        } else {
          result.useBg1Situation = false
        }
      } else {
        if (user.notUseBg1Reason && user.notUseBg1Reason === 'gotButNoUse') {
          result.useBg1Situation = true
        } else {
          result.useBg1Situation = false
        }
      }
    } else {
      if (!user.notUseBg1Reason) {
        result.useBg1Situation = true
      } else {
        result.useBg1Situation = false
      }
    }
  } else {
    result.useBg1Situation = false
  }

    // const userCount = await db
    //     .collection('users')
    //     .find({
    //         _id:ObjectID.createFromHexString(args.patientId),
    //         $or:[
    //             {
    //                 isUseBg1:true,
    //             },
    //             {
    //                 $and:[
    //                     {$or:[{isUseBg1:false},{isUseBg1:{$exists:false}}]},{notUseBg1Reason:{$exists:true}},{notUseBg1Reason:'gotButNoUse'}
    //                 ]
    //             }
    //         ]
    //     })
    //     .count()

    // result.useBg1Situation = (userCount !== 0)

    console.log('getUserUseBg1Situation called! result',result)
    return result
}
