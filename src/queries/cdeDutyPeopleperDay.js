export const cdeDutyPeopleperDay = async(_, args, {getDb}) => {
  const db = await getDb()
  const duty = await db
    .collection('cdeDutys')
    .findOne({state: true})

  return duty.dutyPeopleperDay;
}
