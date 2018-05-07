import freshId from 'fresh-id'

export const reportDevice = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, deviceBrand, deviceSystemVersion, deviceSystemName } = args
  let result = await db.collection('errorDevices').insert({
    _id: freshId(),
    patientId,
    deviceBrand,
    deviceSystemVersion,
    deviceSystemName,
    reportDate: new Date(),
  })
  if (!!result.result.ok) {
    return true
  }
  return false
}
