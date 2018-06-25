import { get } from 'lodash'
const OAuth = require('co-wechat-oauth')

const { APP_ID, APP_SECRET } = process.env
const client = new OAuth(APP_ID, APP_SECRET)

export const wechatLoginOrSignUp = async (_, args, context) => {
  const db = await context.getDb()
  const { wechatCode } = args
  const token = await client.getAccessToken(wechatCode)
  const accessToken = get(token, 'data.access_token')
  const openid = get(token, 'data.openid')

  const existingPatient = await db
    .collection('users')
    .findOne({ wechatOpenId: openid })
  console.log('existingPatient', existingPatient, openid)
  if (existingPatient) {
    console.log('existingPatient---->>>', existingPatient)
    return {
      patientId: existingPatient._id,
      avatar: existingPatient.avatar,
      nickname: existingPatient.nickname,
      patientState: existingPatient.patientState,
      birthday: existingPatient.dateOfBirth,
      gender: existingPatient.gender,
      didCreateNewPatient: false,
      height: existingPatient.height,
      weight: existingPatient.weight,
      diabetesType: existingPatient.diabetesType,
      startOfIllness: existingPatient.startOfIllness,
      targetWeight: existingPatient.targetWeight,
      username: existingPatient.username.replace('@ijk.com', ''),
    }
  }
  console.log('not-exist--->', openid)
  const wechatInfo = await client.getUser(openid)
  await db
    .collection('wechats')
    .update(
      { openid },
      { ...wechatInfo, updatedAt: new Date() },
      { upsert: true },
    )

  return { wechatOpenId: openid, didCreateNewPatient: true }
}
