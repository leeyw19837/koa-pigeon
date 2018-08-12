import { reminder } from '../controller'
import { sendMiniProgram } from '../controller/sendMiniProgram'
import {
  sendChatCardMessages,
  checkOverdueForAfterTreatment,
} from '../controller/treatment-card'
import { sendOutpatientPushMessages } from '../controller/outpatient-push'
import { assignPatientToCde } from '../controller/cde-account'

const Router = require('koa-router')
const cronJob = new Router()

cronJob.post('/new-text-measure-plan', async ctx => {
  const { body, header, ip } = ctx.request
  console.log('============== cron-job start =============' + 'from ip:' + ip)
  if (header.authorization != '4Z21FjF') {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { weekday, patientsId = [], isTest } = body
  const result = await reminder(weekday, patientsId, isTest)
  console.log('============== cron-job end =============' + 'from ip:' + ip)
  const bodyInfo = patientsId.length ? result : result.length
  ctx.body = bodyInfo
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
  const { pwd, day, hour } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const result = await sendOutpatientPushMessages(day, hour)
  if (result) {
    ctx.body = 'OK! ' + result
  }
})

cronJob.post('/assign-patient-to-cde', async ctx => {
  const { header, ip } = ctx.request
  console.log(
    '============== assign-patient-to-cde start =============' +
      'from ip:' +
      ip,
  )
  if (header.authorization != '4Z21FjF') {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const result = await assignPatientToCde()
  console.log(
    '============== assign-patient-to-cde end =============' + 'from ip:' + ip,
  )
  ctx.body = 'OK'
})

export default cronJob
