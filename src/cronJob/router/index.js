import { reminder } from '../controller'
import { sendMiniProgram } from '../controller/sendMiniProgram'
import {
  sendChatCardMessages,
  checkOverdueForAfterTreatment,
} from '../controller/treatment-card'
import { sendOutpatientPushMessages } from '../controller/outpatient-push'
import { assignPatientToCde } from '../controller/cde-account'
import { authorization } from '../../utils/authorization'
import {
  saveDutyQueue,
  getNextDutyCdes,
  sendDutyMessage,
  verifyNotify,
  reNotify,
} from '../controller/duty'
import { completeOutpatient } from '../services/outpatient'
import { treatmentReminderViaText } from '../services/textMessage'

const Router = require('koa-router')
const cronJob = new Router()

cronJob.post('/new-text-measure-plan', async ctx => {
  const { body, header, ip } = ctx.request
  console.log('============== cron-job start =============from ip:' + ip)
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { weekday, patientsId = [], isTest } = body
  const result = await reminder(weekday, patientsId, isTest)
  console.log('============== cron-job end =============from ip:' + ip)
  const bodyInfo = patientsId.length ? result : result.length
  ctx.body = bodyInfo
})

cronJob.get('/mini-program-send', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { period, patientId } = ctx.query
  const result = await sendMiniProgram(period, patientId)
  ctx.body = 'OK'
})

cronJob.get('/send-treatment-card', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { pwd, isTest } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  const result = await sendChatCardMessages(isTest)
  ctx.body = 'OK'
})

cronJob.get('/check-three-card-overdue', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { pwd } = ctx.query
  if (pwd !== 'cm9vc3Rlcl9kb2RneV9kb3Zl') {
    return ctx.throw(401, '密码错误')
  }
  await checkOverdueForAfterTreatment()
  ctx.body = 'OK'
})

cronJob.get('/send-outpatient-push-msgs', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
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
    '============== assign-patient-to-cde start =============from ip:' + ip,
  )
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  await assignPatientToCde()
  ctx.body = 'OK'
  console.log(
    '============== assign-patient-to-cde end =============from ip:' + ip,
  )
})

cronJob.get('/save-duty-queue', async ctx => {
  //------------FOR TEST ONLY！------------
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const result = await saveDutyQueue()
  if (result) {
    ctx.body = 'OK! ' + result
  }
})
cronJob.get('/get-next-duty-cdes', async ctx => {
  //------------FOR TEST ONLY！------------
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const result = await getNextDutyCdes()
  if (result) {
    ctx.body = 'OK! ' + result
  }
})

cronJob.get('/send-duty-message', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { testDate } = ctx.query
  const result = await sendDutyMessage(testDate)
  if (result) {
    ctx.body = 'OK! ' + result
  }
})

cronJob.get('/verify-duty-message', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { testDate } = ctx.query
  await verifyNotify(testDate)
  ctx.body = 'OK! '
})

cronJob.get('/renotify-duty-message', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { testDate } = ctx.query
  await reNotify(testDate)
  ctx.body = 'OK! '
})

cronJob.post('/complete-outpatient', async ctx => {
  if (!authorization(ctx)) {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const { testDate } = ctx.query
  await completeOutpatient()
  ctx.body = 'OK! '
})

/**
 * 就诊提醒短信
 */
cronJob.post('/reminder-treatment-text', async ctx => {
  // if (!authorization(ctx)) {
  //   return ctx.throw(401, '密码错误或参数不正确')
  // }
  const { body } = ctx.request
  const { isTest, nextDays = 1 } = body
  const result = await treatmentReminderViaText({ isTest, nextDays: +nextDays })
  ctx.body = result
})
export default cronJob
