import {verify} from 'jsonwebtoken'

export const Auth = jwtSecret => {
  return async(ctx, next) => {
    const {authorization, referer, origin} = ctx.request.headers

    const route = referer && origin && referer.substr(origin.length)

    // if (route === '/login' || !route) {   return await next() }

    if (authorization) {
      console.log('This request has authorization header')
      const parts = authorization.split(' ')
      if (parts[0] == 'Bearer') {
        const token = parts[1]
        try {
          const payload = verify(token, jwtSecret)

          ctx.userInfo = payload

        } catch (e) {
          ctx.userInfo = null
          console.log('jwt expired')
        }
        await next()
      }
    } else {
      console.log('This request has NO authorization header')
      return await next()
    }

  }
}