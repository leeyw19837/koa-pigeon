import { GraphQLError } from 'graphql'

let { AUTH } = process.env
if (!AUTH) AUTH = 'FALSE'

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
    ].indexOf(funcName) == -1
  ) {
    if (!ctx.userInfo) {
      if (AUTH === 'TRUE') throw new GraphQLError('AuthenticationError')
    }
  }
  return func(rootValue, args, ctx)
}
