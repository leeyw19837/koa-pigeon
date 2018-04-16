import freshId from 'fresh-id'
import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import { DigestiveStateLookup } from '../utils/i18n'
import { maybeCreateFromHexString } from '../utils/maybeCreateFromHexString'

export const saveBloodGlucoseMeasurementNew = async (
  _,
  args,
  { getDb }: IContext,
) => {
  const db = await getDb()
  const {
    bloodGlucoseValue,
    bloodGlucoseDataSource,
    inputType,
    patientId,
    measurementTime,
    deviceInformation,
    measuredAt,
  } = args

  const objFirst = {
    bloodGlucoseValue,
    bloodGlucoseDataSource,
    inputType,
    patientId,
    measurementTime,
    deviceInformation,
    measuredAt,
  }
  const frId = freshId()
  const objSecond = {
    _id: frId,
    sourceId: frId,
    note: '',
    labels: [],
    dataStatus: 'ACTIVE',
    createdAt: measuredAt,
    updatedAt: measuredAt,
  }

  const objectToWrite = { ...objFirst, ...objSecond }
  const retVal = await db.collection('bloodGlucoses').insertOne(objectToWrite)
  const rz = retVal.ops[0]
  const user = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
    patientState: { $exists: 1 },
  })
  const mobile = user.username.replace('@ijk.com', '')
  const nickname = user.nickname
  if (user.healthCareTeamId && user.healthCareTeamId.length > 0) {
    if (parseFloat(bloodGlucoseValue) >= 18 * 10) {
      await db.collection('warnings').insertOne({
        bloodglucoseId: rz._id, // 关联的测量记录
        bloodGlucoseValue, // 本次记录的血糖值，转换后
        warningType: 'HIGH_GLUCOSE', // 预备以后有别的警告记录种类
        dinnerSituation: measurementTime,
        patientId,
        nickname,
        gender: user.gender, // 'male/female',
        dateOfBirth: user.dateOfBirth,
        mobile,
        createdAt: new Date(),
        healthCareTeamId: user.healthCareTeamId[0],
      })
    } else if (parseFloat(bloodGlucoseValue) < 18 * 4) {
      await db.collection('warnings').insertOne({
        bloodglucoseId: rz._id, // 关联的测量记录
        bloodGlucoseValue, // 本次记录的血糖值，转换后
        warningType: 'LOW_GLUCOSE', // 预备以后有别的警告记录种类
        dinnerSituation: measurementTime,
        patientId,
        nickname,
        gender: user.gender, // 'male/female',
        dateOfBirth: user.dateOfBirth,
        mobile,
        createdAt: new Date(),
        healthCareTeamId: user.healthCareTeamId[0],
      })
    }
  }
  return !!retVal.result.ok ? retVal.insertedId : null
}
export const updateRemarkOfBloodglucoses = async (
  _,
  args,
  { getDb }: IContext,
) => {
  const db = await getDb()

  const { _id, remark } = args

  const retVal = await db
    .collection('bloodglucoses')
    .update({ _id: maybeCreateFromHexString(_id) }, { $set: { remark } })
  return !!retVal.result.ok
}

export const deleteOfBloodglucoses = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  const { _id } = args
  const retValue = await db
    .collection('bloodglucoses')
    .deleteOne({ _id: maybeCreateFromHexString(_id) })
  await db
    .collection('warnings')
    .deleteOne({ bloodglucoseId: maybeCreateFromHexString(_id) })
  return !!retValue.result.ok
}
