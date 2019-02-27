import { reminder } from '../controller'
import { sendMiniProgram } from '../controller/sendMiniProgram'
import {
  sendChatCardMessages,
  checkOverdueForAfterTreatment,
} from '../controller/treatment-card'
import { sendOutpatientPushMessages } from '../controller/outpatient-push'
import { assignPatientToCde } from '../controller/cde-account'
import {
  saveDutyQueue,
  getNextDutyCdes,
  sendDutyMessage,
  verifyNotify,
  reNotify,
} from '../controller/duty'
import { completeOutpatient } from '../services/outpatient'
import { treatmentReminderViaText } from '../services/textMessage'
import { verifyOrderValidity } from '../controller/orders'
import { sendMassMessages } from '../../modules/chat/massMessages'
import { stop19SprintFestival } from '../controller/stop-treatment'
import { getUserInfo } from '../controller/userInfo'
import { sendOutpatientReminder } from '../services/outpatientPlan'

const moment = require('moment')
const Router = require('koa-router')
const cronJob = new Router()

cronJob.post('/new-text-measure-plan', async ctx => {
  const { body, ip } = ctx.request
  console.log('============== cron-job start =============from ip:' + ip)
  const { weekday, patientsId = [], isTest } = body
  const result = await reminder(weekday, patientsId, isTest)
  console.log('============== cron-job end =============from ip:' + ip)
  const bodyInfo = patientsId.length ? result : result.length
  ctx.body = bodyInfo
})

cronJob.get('/mini-program-send', async ctx => {
  const { period, patientId } = ctx.query
  await sendMiniProgram(period, patientId)
  ctx.body = 'OK'
})

cronJob.get('/send-treatment-card', async ctx => {
  const { isTest } = ctx.query
  await sendChatCardMessages(isTest)
  ctx.body = 'OK'
})

cronJob.get('/check-three-card-overdue', async ctx => {
  await checkOverdueForAfterTreatment()
  ctx.body = 'OK'
})

cronJob.get('/send-outpatient-push-msgs', async ctx => {
  const { day, hour } = ctx.query
  const result = await sendOutpatientPushMessages(day, hour)
  if (result) {
    ctx.body = 'OK! ' + result
  }
})

cronJob.post('/assign-patient-to-cde', async ctx => {
  const { ip } = ctx.request
  console.log(
    '============== assign-patient-to-cde start =============from ip:' + ip,
  )
  await assignPatientToCde()
  ctx.body = 'OK'
  console.log(
    '============== assign-patient-to-cde end =============from ip:' + ip,
  )
})

cronJob.get('/save-duty-queue', async ctx => {
  //------------FOR TEST ONLY！------------
  const result = await saveDutyQueue()
  if (result) {
    ctx.body = 'OK! ' + result
  }
})
cronJob.get('/get-next-duty-cdes', async ctx => {
  //------------FOR TEST ONLY！------------
  const result = await getNextDutyCdes()
  if (result) {
    ctx.body = 'OK! ' + result
  }
})

cronJob.get('/send-duty-message', async ctx => {
  const { testDate } = ctx.query
  const result = await sendDutyMessage(testDate)
  if (result) {
    ctx.body = 'OK! ' + result
  }
})

cronJob.get('/verify-duty-message', async ctx => {
  const { testDate } = ctx.query
  await verifyNotify(testDate)
  ctx.body = 'OK! '
})

cronJob.get('/renotify-duty-message', async ctx => {
  const { testDate } = ctx.query
  await reNotify(testDate)
  ctx.body = 'OK! '
})

cronJob.post('/complete-outpatient', async ctx => {
  const { testDate } = ctx.query
  await completeOutpatient()
  ctx.body = 'OK! '
})

/**
 * 就诊提醒短信
 */
cronJob.post('/reminder-treatment-text', async ctx => {
  const { body } = ctx.request
  const { isTest, nextDays = 1, preCheck } = body
  const result = await treatmentReminderViaText({
    isTest,
    nextDays: +nextDays,
    preCheck,
  })
  ctx.body = result
})

/**
 * 订单过期检测
 */
cronJob.get('/verify_order_validity', async ctx => {
  const { frequency } = ctx.query
  console.log('interface called!')
  const result = await verifyOrderValidity(frequency)
  ctx.body = 'OK! ' + result
})

/**
 * 新春活动的通知
 */
cronJob.post('/sprint-festival-hi', async ctx => {
  const { ip, body = {} } = ctx.request
  console.log('===== sprint-festival-hi start =====from ip:' + ip)
  await sendMassMessages(body)
  ctx.body = 'OK'
  console.log('===== sprint-festival-hi end =====from ip:' + ip)
})

cronJob.post('/stop-treatment', async ctx => {
  const { ip, body = {} } = ctx.request
  console.log('===== stop-treatment start =====from ip:' + ip)
  const currentDay = moment().format('YYYY-MM-DD')
  if (currentDay === '2019-02-01') {
    await stop19SprintFestival(body)
  }
  ctx.body = 'OK'
  console.log('===== stop-treatment end =====from ip:' + ip)
})

cronJob.get('/getUserInfo', async ctx => {
  console.log('From TIAN JIN server')
  const { header } = ctx.request
  if (header.authorization != '4Z21FjF') {
    return ctx.throw(401, '密码错误或参数不正确')
  }
  const result = await getUserInfo(ctx)
  ctx.body = result
})

cronJob.get('/sendOutpatientPlanReminder', async ctx => {
  console.log('======== start send outpatientPlan reminder =======')
  await sendOutpatientReminder()
  console.log('======== outpatientPlan reminder sent =======')
  ctx.body = 'OK'
})

export default cronJob
