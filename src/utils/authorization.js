import jwt from 'jsonwebtoken'

export const authorization = ctx => {
  const {
    body,
    header,
    ip
  } = ctx.request
  const {
    JWT_SECRET,
  } = process.env;

  if (header.authorization) {
    const parts = header.authorization.split(' ');
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];
      if (/^Bearer$/i.test(scheme)) {
        try {
          const jwtData = jwt.verify(credentials, JWT_SECRET);
          console.log('authorization', jwtData)
          if (jwtData.user && jwtData.user.roles && jwtData.user.roles.indexOf('admin') > -1) {
            return true
          }
        } catch (e) {
          console.log('authorization', e)
        }
      }
    }
  }
  return false
}