
import { getUserInfo, getUserInfoByUnionId } from '../controller'

const Router = require('koa-router')
const miniProgram = new Router()

// 解密用户信息 获取 openId, unionId等加密信息
miniProgram.get('/decodeUserInfo', async ctx => {
  const { pwd, code } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  if (!code) {
    return ctx.throw(400, 'code 不能为空')
  }
  const result = await getUserInfo(code)
  if (result.errcode) {
    return ctx.throw(400, result.errmsg)
  }
  ctx.body = result
})

miniProgram.get('/userInfoByUnionId', async ctx => {
  const { pwd, unionId } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  if(!unionId) {
    return ctx.throw(400, 'unionId 不能为空')
  }
  const result = await getUserInfoByUnionId(unionId)
  ctx.body = result
})

export default miniProgram
