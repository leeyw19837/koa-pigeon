import { GraphQLError } from 'graphql'
import jwt from 'jsonwebtoken'
import get from 'lodash/get'

let { AUTH, JWT_SECRET } = process.env
if (!AUTH) AUTH = 'FALSE'

const isAuth = ctx => {
  const authorization = get(ctx, 'req.headers.authorization')
  if (AUTH === 'FALSE') return true
  if (authorization) {
    const parts = authorization.split(' ')
    if (parts.length === 2) {
      const scheme = parts[0]
      const credentials = parts[1]
      if (/^Bearer$/i.test(scheme)) {
        try {
          jwt.verify(credentials, JWT_SECRET)
          return true
        } catch (e) {
          console.log('authorization', e)
        }
      }
    }
  }
  return false
}

export const userAuth = user => {
  if (!user) {
    if (AUTH === 'TRUE') throw new GraphQLError('AuthenticationError')
  }
}

export const logandAuthForApp = (requestType, funcName, func) => async (
  rootValue,
  args,
  ctx,
) => {
  if (funcName !== 'saveFoodContents') {
    console.log(
      `${requestType}: Calling ${funcName} with args ${JSON.stringify(args)}`,
    )
  }
  if (
    [
      'loginOrSignUp',
      'wechatLoginOrSignUp',
      'professionalLoginForWechat',
      'professionalLoginForMobile',
      'sendMobileVerificationCode',
      'sendMobileVerificationCodeForWeb',
      'professionalLogin',
      'chatMessages',
    ].indexOf(funcName) == -1
  ) {
    if (!isAuth(ctx)) {
      throw new GraphQLError('AuthenticationError')
    }
  }
  return func(rootValue, args, ctx)
}
