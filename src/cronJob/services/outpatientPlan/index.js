import dayjs from 'dayjs'
import { ObjectId } from 'mongodb'
import { union, map } from 'lodash'
import { sendTxt } from '../../../common'

export const sendOutpatientReminder = async () => {
  const tomorrowDateStr = dayjs()
    .add(1, 'day')
    .format('YYYY-MM-DD')
  const outpatientsAtTomorrow = await db
    .collection('outpatientPlan')
    .find({ date: tomorrowDateStr }, { patientIds: 1 })
    .toArray()
  let patientIds = union(
    ...map(outpatientsAtTomorrow, op => op.patientIds || []),
  )
  patientIds = map(patientIds, p => ObjectID(p))
  const patients = await db
    .collection('users')
    .find({ _id: patientIds }, { username: 1, nickname })
    .toArray()

  // 确定短信模板后再接着写
  // patients.forEach(patient => {
  //   //mobile, templateId, params
  //   sendTxt({ mobile: patient.username, templateId: 'xxxxx', params: {}})
  // })
}
