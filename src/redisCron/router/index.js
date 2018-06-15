import { addDelayEvent } from '../controller'
const Router = require('koa-router')
const redisCron = new Router()

redisCron.get('/testmessage', async ctx => {
  addDelayEvent('testmessage', 5)
})

export default redisCron
