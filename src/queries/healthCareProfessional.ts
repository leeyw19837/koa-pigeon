import { get } from 'lodash'
import { IContext } from '../types'
const OAuth = require('co-wechat-oauth')
import { verify } from 'righteous-raven'

const { APP_ID, APP_SECRET } = process.env
const client = new OAuth(APP_ID, APP_SECRET)
const {
  RIGHTEOUS_RAVEN_URL,
  RIGHTEOUS_RAVEN_ID,
  RIGHTEOUS_RAVEN_KEY,
} = process.env
export const professionalLogin = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  // const clientCodename = context.state.clientCodename
  const { username, password } = args
  if (password !== 'zhufanglu2017') {
    throw new Error('密码错误！')
  }

  const existingDoctor = await db.collection('users').findOne({ username })
  if (!existingDoctor) {
    throw new Error('用户不存在！')
  }

  return existingDoctor
}
export const professionalLoginForWechat = async (
  _,
  args,
  { getDb, jwtsign }: IContext,
) => {
  const db = await getDb()
  const { wechatCode } = args
  const token = await client.getAccessToken(wechatCode)
  const accessToken = get(token, 'data.access_token')
  const openid = get(token, 'data.openid')

  const existingUser = await db
    .collection('users')
    .findOne({ wechatOpenId: openid })
  if (existingUser) {
    return {
      ...existingUser,
      username: existingUser.username.replace('@ijk.com', ''),
      jwt: jwtsign({ _id: existingUser._id }),
    }
  }
}
export const professionalLoginForMobile = async (
  _,
  args,
  { getDb, jwtsign }: IContext,
) => {
  const db = await getDb()
  const { mobile, verificationCode } = args

  if (verificationCode !== '0000') {
    const verificationResult = await verify(RIGHTEOUS_RAVEN_URL, {
      client_id: RIGHTEOUS_RAVEN_ID,
      client_key: RIGHTEOUS_RAVEN_KEY,
      rec: mobile,
      code: verificationCode,
    })
    // verificationCode !== '0000' for testing
    if (
      verificationResult.data.result !== 'success' &&
      verificationCode !== '0000'
    ) {
      throw new Error('验证码不正确')
    }
  }
  const existingUser = await db.collection('users').findOne({ mobile })
  if (existingUser) {
    return {
      ...existingUser,
      username: existingUser.username.replace('@ijk.com', ''),
      jwt: jwtsign({ _id: existingUser._id }),
    }
  }
}
