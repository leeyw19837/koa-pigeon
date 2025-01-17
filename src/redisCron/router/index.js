import moment from 'moment'
import { addDelayEvent, deleteDelayEvent, queryDelayEvent } from '../controller'
import { saveBloodGlucoseMeasurementNew } from '../../mutations/bloodGlucoseMeasurement'

const Router = require('koa-router')
const redisCron = new Router()
// 调用测试
redisCron.get('/testmessage', async ctx => {
  console.log('添加事件测试')
  await addDelayEvent('testmessage', 10)
  ctx.body = 'OK'
})

redisCron.get('/deltestmessage', async ctx => {
  await deleteDelayEvent('testmessage')
  ctx.body = 'OK'
})

redisCron.get('/bgadd', async ctx => {
  const args = {
    bloodGlucoseValue: 28,
    bloodGlucoseDataSource: 'NEEDLE_BG1',
    inputType: 'DEVICE',
    patientId: '5ab4a677db7e8e31401c9f89',
    measurementTime: 'BEFORE_BREAKFAST',
    deviceInformation: 'test',
    measuredAt: moment('2018-07-16')._d,
  }

  await saveBloodGlucoseMeasurementNew(null, args, {
    getDb: () => global.db,
  })
  ctx.body = 'OK'
})

redisCron.get('/querymessage', async ctx => {
  await queryDelayEvent('bg_88f5578370f3a04743d43fac')
  ctx.body = 'OK'
})

export default redisCron
