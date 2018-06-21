import { addDelayEvent, deleteDelayEvent } from '../controller'
const Router = require('koa-router')
const redisCron = new Router()
// 调用测试
redisCron.get('/testmessage', async ctx => {
  addDelayEvent('testmessage', 10)
})

redisCron.get('/deltestmessage', async ctx => {
  deleteDelayEvent('testmessage')
})

export default redisCron
