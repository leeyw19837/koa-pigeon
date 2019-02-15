import {addUser, detect, searchFace} from "../detect";

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

export default detectFaceApi;
