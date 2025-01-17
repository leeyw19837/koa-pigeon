import { get, isEmpty } from 'lodash'
const OAuth = require('co-wechat-oauth')
import jsonwebtoken from 'jsonwebtoken'

const { APP_ID, APP_SECRET, TOKEN_EXP, TOKEN_EXP_FOR_NEW } = process.env
const client = new OAuth(APP_ID, APP_SECRET)

export const wechatLoginOrSignUp = async (_, args, context) => {
  const db = await context.getDb()
  const { JWT_SECRET } = process.env
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
    let exp = TOKEN_EXP_FOR_NEW;
    if (existingPatient.patientState === 'ACTIVE') {
      exp = TOKEN_EXP; // 1 year
    }
    //JWT签名
    console.log('准备为用户进行JWT签名：', existingPatient)
    const JWT = jsonwebtoken.sign({
      user: existingPatient
    }, JWT_SECRET, { expiresIn: TOKEN_EXP_FOR_NEW })
    console.log('JWT', JWT)
    const isWechat = !isEmpty(existingPatient.wechatInfo)
    console.log('exist--->', openid)
    const wechatInfo = await client.getUser(openid)
    // 头像
    if (!existingPatient.avatar) {
      await db
        .collection('users')
        .update({
          _id: existingPatient._id
        }, {
            $set: {
              avatar: wechatInfo.headimgurl,
              updatedAt: new Date()
            }
          })
    }
    return {
      patientId: existingPatient._id,
      avatar: existingPatient.avatar
        ? existingPatient.avatar
        : isWechat
          ? existingPatient.wechatInfo.headimgurl
            ? existingPatient
              .wechatInfo
              .headimgurl
              .replace('http://', 'https://')
            : existingPatient.gender === 'male'
              ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
              : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png' : existingPatient.gender === 'male'
            ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
            : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png',
      // existingPatient.avatar,
      nickname: existingPatient.nickname,
      patientState: existingPatient.patientState,
      petname: existingPatient.petname,
      birthday: existingPatient.dateOfBirth,
      gender: existingPatient.gender,
      didCreateNewPatient: false,
      height: existingPatient.height,
      weight: existingPatient.weight,
      diabetesType: existingPatient.diabetesType,
      startOfIllness: existingPatient.startOfIllness,
      targetWeight: existingPatient.targetWeight,
      healthCareTeamId: existingPatient.healthCareTeamId
        ? existingPatient.healthCareTeamId[0]
        : '',
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
      })
  //JWT签名
  console.log('准备为新用户进行JWT签名：', openid)
  const JWT = jsonwebtoken.sign({
    user: openid
  }, JWT_SECRET, { expiresIn: TOKEN_EXP_FOR_NEW })
  console.log('JWT', JWT)

  return { wechatOpenId: openid, didCreateNewPatient: true, JWT }
}