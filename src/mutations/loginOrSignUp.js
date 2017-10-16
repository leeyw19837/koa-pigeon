import { GraphQLError } from 'graphql/error'
import { verify } from 'righteous-raven'

import { generateJwt, createNewPatient } from '../utils'

const { RIGHTEOUS_RAVEN_URL, RIGHTEOUS_RAVEN_ID, RIGHTEOUS_RAVEN_KEY } = process.env

export const loginOrSignUp = async (_, args, context) => {
  const db = await context.getDb()
  // const clientCodename = context.state.clientCodename
  const { mobile, verificationCode } = args
  
  const verificationResult = await verify(RIGHTEOUS_RAVEN_URL, {
    client_id: RIGHTEOUS_RAVEN_ID,
    client_key: RIGHTEOUS_RAVEN_KEY,
    rec: mobile,
    code: verificationCode,
  })
  if (verificationResult.data.result !== 'success') {
    throw new Error('验证码不正确')
  }

  const existingPatient = await db.collection('users').findOne({ username: `${mobile}@ijk.com` })
  if (existingPatient) {
    return {
      didCreateNewPatient: false,
      _id: existingPatient._id,
      avatar: existingPatient.avatar,
      nickname: existingPatient.nickname,
    }
  }

  // const patient = createNewPatient(null, mobile, clientCodename)
  const response = await db.collection('users').insertOne({ username: `${mobile}@ijk.com`, createdAt: new Date(), patientState: 'POTENTIAL' })
  const newPatient = response.ops[0]
  return {
    didCreateNewPatient: true,
    _id: newPatient._id,
    avatar: newPatient.avatar,
    nickname: newPatient.nickname,
  }
}
