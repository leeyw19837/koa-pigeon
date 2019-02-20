import koajwt from 'koa-jwt'
let { JWT_SECRET, AUTH, SECRET } = process.env

export const useJwt = () => {
  if (AUTH === 'TRUE') {
    App.use(
      koajwt({ secret: JWT_SECRET }).unless({
        path: [
          /^\/public/,
          '/healthcheck',
          '/login',
          '/register',
          /\/api*/,
          /\/wx-mini*/,
          `/${SECRET}`,
          /\/feedback*/,
        ],
      }),
    )
  }
}
