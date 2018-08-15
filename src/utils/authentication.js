import {
  GraphQLError
} from 'graphql';

export const userAuth = user => {
  if (!user) {
    throw new GraphQLError('AuthenticationError', );
  }
}


export const authForApp = (requestType, funcName, func) => async (
  rootValue,
  args,
  ctx,
) => {
  if (funcName !== 'loginOrSignUp' && funcName !== 'wechatLoginOrSignUp') {
    if (!ctx.userInfo) {
      throw new GraphQLError('AuthenticationError', );
    }
  }
  return func(rootValue, args, ctx)
}