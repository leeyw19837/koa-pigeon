import freshId from 'fresh-id'
import { IContext } from '../types'
import { DigestiveStateLookup } from '../utils/i18n'
import {maybeCreateFromHexString} from '../utils/maybeCreateFromHexString'

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
    deviceContext,
  } = args

  const newFormat = {
    patientId,
    bloodGlucose,
    digestiveState,
    measurementDeviceModel,
    measuredAt,
    deviceContext,
  }
  const dinnerSituation = Object.entries(DigestiveStateLookup).find(
    ([key, value]) => value === digestiveState,
  )![0]
  const convertGlucoseTypeToUSString = value => {
    if (!value) return ''
    return `${Math.round(value * 18)}`
  }
  let bgValue = ''
  if (bloodGlucose.unit.toLowerCase() === 'mg/dl') bgValue = bloodGlucose.value

  if (bloodGlucose.unit.toLowerCase() === 'mmol/l')
    bgValue = convertGlucoseTypeToUSString(bloodGlucose.value)

  const oldFormat = {
    bgValue,
    dinnerSituation,
    author: patientId,
    createdAt: measuredAt,
    iGlucoseDataId: freshId(17), // this is forced to unique so this is a hack
  }
  const objectToWrite = { ...oldFormat, ...newFormat }
  const retVal = await db.collection('bloodglucoses').insertOne(objectToWrite)

  return !!retVal.result.ok ? retVal.insertedId : null
}
export const updateRemarkOfBloodglucoses = async (
  _,
  args,
  { getDb }: IContext,
) => {
  const db = await getDb()

  const {
    _id,
    remark,
  } = args


  
  const retVal = await db.collection('bloodglucoses').update({_id:maybeCreateFromHexString(_id)},{$set:{remark}})
  return !!retVal.result.ok
}
