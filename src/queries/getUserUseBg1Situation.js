import { ObjectID } from 'mongodb'
export const getUserUseBg1Situation = async (_, args, { getDb }) => {
    console.log('getUserUseBg1Situation called!')
    const db = await getDb()
    let result = {
        useBg1Situation: false
    }

  // const user = await db
  //     .collection('users')
  //     .find({
  //         _id:ObjectID.createFromHexString(args.patientId)
  //     })
  //     .toArray()
  //
  // if (user && user.length > 0) {
  //   if (user.isUseBg1) {
  //     if (user.isUseBg1 === true) {
  //       if (!user.notUseBg1Reason) {
  //         result.useBg1Situation = true
  //       } else {
  //         result.useBg1Situation = false
  //       }
  //     } else {
  //       if (user.notUseBg1Reason && user.notUseBg1Reason === 'gotButNoUse') {
  //         result.useBg1Situation = true
  //       } else {
  //         result.useBg1Situation = false
  //       }
  //     }
  //   } else {
  //     if (!user.notUseBg1Reason) {
  //       result.useBg1Situation = true
  //     } else {
  //       result.useBg1Situation = false
  //     }
  //   }
  // } else {
  //   result.useBg1Situation = false
  // }

  const userBG1NotUseReasons = await db
    .collection('BG1NotUseReason')
    .find({
        _id:args.patientId
    })
    .sort({createdAt:-1})
    .toArray()

  if (userBG1NotUseReasons && userBG1NotUseReasons.length>0){
      const latestReason = userBG1NotUseReasons[0]
      const { isGotBG1, isUseBG1, reason } = latestReason

      if (isGotBG1 && !isUseBG1 && reason && reason!==''){
        result.useBg1Situation = true
      } else {
        result.useBg1Situation = false
      }
  }

  console.log('getUserUseBg1Situation called! result',result)
  return result
}
