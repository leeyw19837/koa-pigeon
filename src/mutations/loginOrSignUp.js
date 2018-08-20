import {GraphQLError} from 'graphql/error'
import {verify} from 'righteous-raven'
import jsonwebtoken from 'jsonwebtoken'

import {generateJwt, createNewPatient} from '../utils'

const {RIGHTEOUS_RAVEN_URL, RIGHTEOUS_RAVEN_ID, RIGHTEOUS_RAVEN_KEY, JWT_SECRET} = process.env
export const updatePatientDemographics = async(_, args, context) => {
  const db = await context.getDb()
  const {mobile, birthday, height, weight, gender} = args
  await db
    .collection('users')
    .update({
      username: {
        $regex: mobile
      }
    }, {
      $set: {
        dateOfBirth: birthday,
        height,
        weight,
        gender,
        updatedAt: new Date()
      }
    },)
  return true
}

export const loginOrSignUp = async(_, args, context) => {
  const db = await context.getDb()
  // const clientCodename = context.state.clientCodename
  const {mobile, verificationCode, wechatOpenId} = args

  if (!/^1[3|4|5|7|8][0-9]\d{8}$/.test(mobile)) {
    throw new Error('手机号码格式不正确')
    return
  }
  if (verificationCode !== '0000') {
    const verificationResult = await verify(RIGHTEOUS_RAVEN_URL, {
      client_id: RIGHTEOUS_RAVEN_ID,
      client_key: RIGHTEOUS_RAVEN_KEY,
      rec: mobile,
      code: verificationCode
    })
    // verificationCode !== '0000' for testing
    if (verificationResult.data.result !== 'success' && verificationCode !== '0000') {
      throw new Error('验证码不正确')
    }
  }
  const existingPatient = await db
    .collection('users')
    .findOne({
      username: {
        $regex: mobile
      }
    })
  if (existingPatient) {
    if (wechatOpenId && !existingPatient.wechatOpenId) {
      await db
        .collection('users')
        .update({
          _id: existingPatient._id
        }, {
          $set: {
            wechatOpenId,
            updatedAt: new Date(),
            isUseNeedle: true
          }
        },)
    } else {
      await db
        .collection('users')
        .update({
          _id: existingPatient._id
        }, {
          $set: {
            updatedAt: new Date(),
            isUseNeedle: true
          }
        },)
    }
    let exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7);
    if (existingPatient.patientState === 'ACTIVE') {
      exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365); // 1 year
    }

    //JWT签名 console.log('准备为用户进行JWT签名：', existingPatient)
    const JWT = jsonwebtoken.sign({
      user: existingPatient,
      // 设置 token 过期时间
      exp
    }, JWT_SECRET)
    // console.log('JWT', JWT)
    return {
      patientId: existingPatient._id,
      didCreateNewPatient: false,
      avatar: existingPatient.avatar,
      nickname: existingPatient.nickname,
      patientState: existingPatient.patientState,
      birthday: existingPatient.dateOfBirth,
      gender: existingPatient.gender,
      height: existingPatient.height,
      weight: existingPatient.weight,
      diabetesType: existingPatient.diabetesType,
      startOfIllness: existingPatient.startOfIllness,
      targetWeight: existingPatient.targetWeight,
      mobile: existingPatient
        .username
        .replace('@ijk.com', ''),
      JWT
    }
  }

  const patientInfo = {
    username: mobile,
    createdAt: new Date(),
    patientState: 'POTENTIAL',
    isUseNeedle: true
  }
  if (wechatOpenId) 
    patientInfo.wechatOpenId = wechatOpenId

  const response = await db
    .collection('users')
    .insertOne(patientInfo)
  const newPatient = response.ops[0]
  //JWT签名 console.log('准备为新用户进行JWT签名：', newPatient)
  const JWT = jsonwebtoken.sign({
    user: newPatient,
    // 设置 token 过期时间
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
  }, JWT_SECRET)
  // console.log('JWT', JWT)
  return {
    patientId: newPatient._id,
    didCreateNewPatient: true,
    patientState: newPatient.patientState,
    mobile: newPatient
      .username
      .replace('@ijk.com', ''),
    JWT
  }
}