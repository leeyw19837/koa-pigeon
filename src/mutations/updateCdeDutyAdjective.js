export const updateCdeDutyAdjective = async(_, params, context) => {
  const {adjective} = params
  let $setObj = {

    state: true,
    adjective,
    updatedAt: new Date()
  }
  await db
    .collection('cdeDutyAdjective')
    .update({
      state: true
    }, {
      $set: $setObj
    }, {
      upsert: true
    },)
  context
    .response
    .set('effect-types', 'adjective')
  return true
}
