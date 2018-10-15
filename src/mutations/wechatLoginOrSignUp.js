import {get} from 'lodash'
const OAuth = require('co-wechat-oauth')
import jsonwebtoken from 'jsonwebtoken'

const {APP_ID, APP_SECRET} = process.env
const client = new OAuth(APP_ID, APP_SECRET)

export const wechatLoginOrSignUp = async(_, args, context) => {
  const db = await context.getDb()
  const {JWT_SECRET} = process.env
  const {wechatCode} = args
  const token = await client.getAccessToken(wechatCode)
  const accessToken = get(token, 'data.access_token')
  const openid = get(token, 'data.openid')
  const existingPatient = await db
    .collection('users')
    .findOne({wechatOpenId: openid})
  console.log('existingPatient', existingPatient, openid)
  if (existingPatient) {
    console.log('existingPatient---->>>', existingPatient)
    let exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7);
    if (existingPatient.patientState === 'ACTIVE') {
      exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365); //1 year
    }
    //JWT签名
    console.log('准备为用户进行JWT签名：', existingPatient)
    const JWT = jsonwebtoken.sign({
      user: existingPatient,
      // 设置 token 过期时间
      exp
    }, JWT_SECRET)
    console.log('JWT', JWT)
    const isWechat = existingPatient.wechatInfo
    return {
      patientId: existingPatient._id,
      avatar: existingPatient.avatar
        ? existingPatient.avatar
        : isWechat
          ? existingPatient
            .wechatInfo
            .headimgurl
            .replace('http://', 'https://')
          : existingPatient.gender === 'male'
            ? 'http://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
            : 'http://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png',
      // existingPatient.avatar,
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
      healthCareTeamId: existingPatient.healthCareTeamId[0] || '',
      username: existingPatient
        .username
        .replace('@ijk.com', ''),
      JWT
    }
  }
  console.log('not-exist--->', openid)
  const wechatInfo = await client.getUser(openid)
  await db
    .collection('wechats')
    .update({
      openid
    }, {
      ...wechatInfo,
      updatedAt: new Date()
    }, {
      upsert: true
    },)
  //JWT签名
  console.log('准备为新用户进行JWT签名：', openid)
  const JWT = jsonwebtoken.sign({
    user: openid,
    // 设置 token 过期时间
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
  }, JWT_SECRET)
  console.log('JWT', JWT)

  return {wechatOpenId: openid, didCreateNewPatient: true, JWT}
}