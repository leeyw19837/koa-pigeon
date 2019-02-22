import {addUser, detect, searchFace, searchUserByPhoneNumber} from "../detect";

const Router = require('koa-router')
const detectFaceApi = new Router()

detectFaceApi.post('/addUser', async (ctx) => {
  const result = await addUser(ctx)
  console.log('addUser result', result, 'ctttx', ctx)
  ctx.body = result
})
detectFaceApi.post('/searchFace', async (ctx) => {
  const result = await searchFace(ctx)
  console.log('searchFace result', result, 'ctttx', ctx)
  ctx.body = result
})

detectFaceApi.post('/searchUserByPhoneNumber', async (ctx) => {
  const result = await searchUserByPhoneNumber(ctx)
  console.log('searchUserByPhoneNumber result', result, 'ctttx', ctx)
  ctx.body = result
})

export default detectFaceApi;
