import { verify } from 'jsonwebtoken'

export const Auth = jwtSecret => {
  return async (ctx, next) => {
    const { authorization, referer, origin } = ctx.request.headers

    const route = referer && origin && referer.substr(origin.length)

    if (!authorization || route === '/login' || !route) {
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
    try {
      const payload = verify(token, jwtSecret)

      ctx.userInfo = payload

      await next()
    } catch (e) {
      ctx.response.status = 500
      ctx.response.body = 'jwt expired'
    }
  }
}
