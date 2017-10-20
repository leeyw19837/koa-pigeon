import { GraphQLError } from 'graphql/error'
import { verify } from 'righteous-raven'

import { generateJwt, createNewPatient } from '../utils'

const { RIGHTEOUS_RAVEN_URL, RIGHTEOUS_RAVEN_ID, RIGHTEOUS_RAVEN_KEY } = process.env

export const loginOrSignUp = async (_, args, context) => {
  const db = await context.getDb()
  // const clientCodename = context.state.clientCodename
  const { mobile, verificationCode, wechatOpenId } = args
  const verificationResult = await verify(RIGHTEOUS_RAVEN_URL, {
    client_id: RIGHTEOUS_RAVEN_ID,
    client_key: RIGHTEOUS_RAVEN_KEY,
    rec: mobile,
    code: verificationCode,
  })

  // verificationCode !== '0000' for testing
  if (verificationResult.data.result !== 'success' && verificationCode !== '0000') {
    throw new Error('验证码不正确')
  }

  const existingPatient = await db.collection('users').findOne({ username: `${mobile}@ijk.com` })
  if (existingPatient) {
    if (wechatOpenId && !existingPatient.wechatOpenId) {
      await db.collection('users').update(
        { username: `${mobile}@ijk.com` }, 
        { $set: { wechatOpenId, updateAt: new Date() } },
      )
    }
    return {
      _id: existingPatient._id,
      avatar: existingPatient.avatar,
      nickname: existingPatient.nickname,
      patientState: existingPatient.patientState,
    }
  }

  const patientInfo = { username: `${mobile}@ijk.com`, createdAt: new Date(), patientState: 'POTENTIAL' }
  if (wechatOpenId) patientInfo.wechatOpenId = wechatOpenId

  const response = await db.collection('users').insertOne(patientInfo)
  const newPatient = response.ops[0]
  return {
    _id: newPatient._id,
    avatar: newPatient.avatar,
    nickname: newPatient.nickname,
    patientState: newPatient.patientState,
  }
}
