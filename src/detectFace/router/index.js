import {addUser, detect, searchFace} from "../detect";
import DetectLogin from '../detectLogin';

const Router = require('koa-router')
const detectFaceApi = new Router()

detectFaceApi.post('/addUser', async (ctx) => {
  const result = await addUser(ctx)
  ctx.body = result
})
detectFaceApi.post('/searchFace', async (ctx) => {
  const result = await searchFace(ctx)
  ctx.body = result
})
detectFaceApi.post('/detectLogin', DetectLogin.login)

export default detectFaceApi;
