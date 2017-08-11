import { IContext } from '../types'
import { DigestiveStateLookup } from '../utils/i18n'

export const saveBloodGlucoseMeasurement = async (
  _,
  args,
  { getDb }: IContext,
) => {
  const db = await getDb()

  const {
    patientId,
    bloodGlucose,
    digestiveState,
    measurementDeviceModel,
    measuredAt,
    appName,
  } = args

  const newFormat = {
    patientId,
    bloodGlucose,
    digestiveState,
    measurementDeviceModel,
    measuredAt,
    appName,
  }

  const dinnerSituation = Object.entries(DigestiveStateLookup).find(
    ([key, value]) => value === digestiveState,
  )![0]
  const convertGlucoseTypeToUSString = value => {
    if (!value) return ''
    return `${value * 18}`
  }
  const oldFormat = {
    bgValue: convertGlucoseTypeToUSString(bloodGlucose.value),
    dinnerSituation,
    author: patientId,
    createdAt: measuredAt,
  }
  const objectToWrite = { ...oldFormat, ...newFormat }
  console.log('write this to db', objectToWrite)
  // await db.collection('bloodglucoses').insertOne(objectToWrite)

  return true
}
