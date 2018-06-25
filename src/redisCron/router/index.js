import { addDelayEvent, deleteDelayEvent, queryDelayEvent } from '../controller'
import { saveBloodGlucoseMeasurementNew } from '../../mutations/bloodGlucoseMeasurement'
const Router = require('koa-router')
const redisCron = new Router()
// 调用测试
redisCron.get('/testmessage', async ctx => {
  addDelayEvent('testmessage', 10)
})

redisCron.get('/deltestmessage', async ctx => {
  deleteDelayEvent('testmessage')
})

redisCron.get('/bgadd', async ctx => {
  const args = {
    bloodGlucoseValue: 128,
    bloodGlucoseDataSource: 'NEEDLE_BG1',
    inputType: 'DEVICE',
    patientId: '5ab4a677db7e8e31401c9f89',
    measurementTime: 'BEFORE_LUNCH',
    deviceInformation: 'test',
  }

  saveBloodGlucoseMeasurementNew(null, args, { getDb: global.db })
})

redisCron.get('/querymessage', async ctx => {
  queryDelayEvent('bg_88f5578370f3a04743d43fac')
})

export default redisCron