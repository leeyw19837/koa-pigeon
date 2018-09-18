export const updateCdeDutyPeopleperDay = async(_, params, context) => {
  const {dutyPeopleperDay} = params
  let $setObj = {
    dutyPeopleperDay
  }
  await db
    .collection('cdeDutys')
    .update({
      state: true
    }, {
      $set: $setObj
    },)
  context
    .response
    .set('effect-types', 'cdeDutys')
  return true
}
