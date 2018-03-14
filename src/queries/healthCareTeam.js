
export const healthCareTeams = async (_, args, { getDb }) => {
  const db = await getDb()
  const hcts = await db
    .collection('healthCareTeams')
    .find({})
    .toArray()
  console.log(hcts, '@hcts')
  return hcts
}
