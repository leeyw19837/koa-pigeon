import bcrypt from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'

const omit = require('lodash/omit')

const {JWT_SECRET, TOKEN_EXP_FOR_API} = process.env;

class DetectLogin {

  /**
   *  @params
   *  userName
   *  password
   */
  async login(ctx) {
    const {body} = ctx.request
    const db = await global.db

    try {
      const user = await db
        .collection('institutions')
        .findOne({
          userName: body
            .userName
            .toString()
        });
      if (!user) {
        ctx.status = 401
        ctx.body = {
          message: '用户名错误'
        }
        return;
      }
      // 匹配密码是否相等
      if (await bcrypt.compare(body.password, user.password)) {
        ctx.status = 200
        const userInfo = {
          groupId:user._id,
          hospitalFullName:user.fullname,
          hospitalLogoImage:user.logoImg,
        }
        ctx.body = {
          message: '登录成功',
          user: userInfo,
          // 生成 token 返回给客户端
          token: jsonwebtoken.sign({
            user: omit(user, 'password')
          }, JWT_SECRET, {expiresIn: TOKEN_EXP_FOR_API})
        }
      } else {
        ctx.status = 401
        const emptyUserInfo = {
          groupId:'',
          hospitalFullName:'',
          hospitalLogoImage:'',
        }
        ctx.body = {
          message: '密码错误',
          user: emptyUserInfo,
          token: '',
        }
      }
    } catch (error) {
      ctx.throw(500)
    }
  }

  /**
   * you can register with
   * curl -X POST http://localhost:3080/register  -H 'cache-control: no-cache' -H 'content-type: application/x-www-form-urlencoded'  -d 'username=superman2&password=123456'
   */
  async register(ctx) {
    const {body} = ctx.request;

    console.log(ctx);
    const db = await global.db
    try {
      if (!body.username || !body.password) {
        ctx.status = 400;
        ctx.body = {
          error: `expected an object with username, password but got: ${body}`
        }
        return;
      }
      body.password = await bcrypt.hash(body.password, 5)
      let user = db
        .collection('User')
        .find({
          username: body
            .username
            .toString()
        });
      if (!user.length) {
        const newUser = body;
        user = await db
          .collection('systemUsers')
          .insert(newUser);
        ctx.status = 200;
        ctx.body = {
          message: '注册成功',
          user
        }
      } else {
        ctx.status = 406;
        ctx.body = {
          message: '用户名已经存在'
        }
      }
    } catch (error) {
      ctx.throw(500)
    }
  }

}


export default new DetectLogin();
