import freshId from 'fresh-id'
import { ObjectID } from 'mongodb'
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
  let rz = retVal.ops[0]
  let user = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
    patientState: { $exists: 1 },
  })
  let mobile = user.username.replace('@ijk.com', '')
  let nickname = user.nickname
  if (parseFloat(bgValue) >= 18 * 10) {
    await db.collection('warnings').insertOne({
      bloodglucoseId: rz._id,//关联的测量记录
      bgValue, //本次记录的血糖值，转换后
      warningType: 'HIGH_GLUCOSE', //预备以后有别的警告记录种类
      dinnerSituation: dinnerSituation,
      patientId,
      nickname,
      gender: user.gender, //'male/female',
      dateOfBirth: user.dateOfBirth,
      mobile,
      createdAt: new Date(),
      healthCareTeamId: user.healthCareTeamId[0],
    })
  } else if (parseFloat(bgValue) < 18 * 4) {
    await db.collection('warnings').insertOne({
      bloodglucoseId: rz._id,//关联的测量记录
      bgValue, //本次记录的血糖值，转换后
      warningType: 'LOW_GLUCOSE', //预备以后有别的警告记录种类
      dinnerSituation: dinnerSituation,
      patientId,
      nickname,
      gender: user.gender, //'male/female',
      dateOfBirth: user.dateOfBirth,
      mobile,
      createdAt: new Date(),
      healthCareTeamId: user.healthCareTeamId[0],
    })
  }
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

export const deleteOfBloodglucoses = async(
 _,
 args,
 { getDb }:IContext
) =>{
  const db = await getDb()

  const {
    _id
  } = args
  const retValue = await db.collection('bloodglucoses').deleteOne({_id:maybeCreateFromHexString(_id)})
  return !!retValue.result.ok
}
