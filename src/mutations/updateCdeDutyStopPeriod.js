export const updateCdeDutyStopPeriod = async(_, params, context) => {
  const {userId, stopPeriod} = params
  let $setObj = {
    stopPeriod
  }
  await db
    .collection('certifiedDiabetesEducators')
    .update({
      userId
    }, {
      $set: $setObj
    },)
  context
    .response
    .set('effect-types', 'certifiedDiabetesEducators')
  return true
}
