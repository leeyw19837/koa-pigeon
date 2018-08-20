import {GraphQLError} from 'graphql';

let {AUTH} = process.env
if (!AUTH) 
  AUTH = 'FALSE';

export const userAuth = user => {
  if (!user) {
    if (AUTH === 'TRUE') 
      throw new GraphQLError('AuthenticationError',);
    }
  }

export const authForApp = (requestType, funcName, func) => async(rootValue, args, ctx,) => {
  if (['loginOrSignUp', 'wechatLoginOrSignUp', 'professionalLoginForWechat', 'professionalLoginForMobile'].indexOf(funcName) == -1) {
    if (!ctx.userInfo) {
      if (AUTH === 'TRUE') 
        throw new GraphQLError('AuthenticationError',);
      }
    }
  return func(rootValue, args, ctx)
}