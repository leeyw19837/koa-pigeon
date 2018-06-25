import { reminder } from '../controller'
import { sendMiniProgram } from '../controller/sendMiniProgram'
import {
  sendChatCardMessages,
  checkOverdueForAfterTreatment,
} from '../controller/treatment-card'
import {
  sendOutpatientPushMessages
} from '../controller/outpatient-push'

const Router = require('koa-router')
const cronJob = new Router()

cronJob.get('/text-measure-plan', async ctx => {
  if (ctx.query.pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const { weekday, patientsId, isTest } = ctx.query
  const aPatientsId = patientsId ? patientsId.split('--') : []
  const result = await reminder(weekday, aPatientsId, isTest)
  ctx.body = result
})

cronJob.get('/mini-program-send', async ctx => {
  if (ctx.query.pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const { period, patientId } = ctx.query
  const result = await sendMiniProgram(period, patientId)
  ctx.body = 'OK'
})

cronJob.get('/send-treatment-card', async ctx => {
  const { pwd, isTest } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const result = await sendChatCardMessages(isTest)
  ctx.body = 'OK'
})

cronJob.get('/check-three-card-overdue', async ctx => {
  const { pwd } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  await checkOverdueForAfterTreatment()
  ctx.body = 'OK'
})

cronJob.get('/send-outpatient-push-msgs', async ctx => {
  // const { pwd, isTest } = ctx.query
  // if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
  //   return ctx.throw(401, '密码错误')
  // }
  const result = await sendOutpatientPushMessages()
  ctx.body = 'OK'
})

export default cronJob
