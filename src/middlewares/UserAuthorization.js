import {
  verify
} from 'jsonwebtoken'

export const Auth = jwtSecret => {
  return async (ctx, next) => {
    const {
      authorization,
      referer,
      origin
    } = ctx.request.headers

    const route = referer && origin && referer.substr(origin.length)

    console.log('authorization', authorization)

    // if (route === '/login' || !route) {   return await next() }

    if (authorization) {
      console.log('if (authorization)', true)
      const parts = authorization.split(' ')
      console.log('parts', parts)
      if (parts[0] == 'Bearer') {
        const token = parts[1]
        console.log('token', token)
        try {
          const payload = verify(token, jwtSecret)

          console.log('payload', payload)

          ctx.userInfo = payload

        } catch (e) {
          ctx.userInfo = null
          console.log('jwt expired')
        }
        await next()
      }
    } else {
      console.log('if (authorization)', false)
      return await next()
    }

  }
}