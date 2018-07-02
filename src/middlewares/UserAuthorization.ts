import { verify } from 'jsonwebtoken'
import Koa = require('koa')

export const Auth = (jwtSecret: string) => {
  return async (ctx: Koa.Context, next: () => Promise<any>) => {
    const { authorization, referer, origin } = ctx.request.headers

    const route = referer.substr(origin.length)

    if (!authorization || route === '/login') {
      return await next()
    }

    const parts = authorization.split(' ')

    if (parts[0] !== 'Bearer:') {
      ctx.throw(
        400,
        'Bad authorization scheme, should be "Authorization: Bearer <token>"',
      )
    }

    const token = parts[1]
    const payload = verify(token, jwtSecret)

    ctx.userInfo = payload

    await next()
  }
}
