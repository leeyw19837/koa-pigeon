import { isEmpty } from 'lodash'
import * as moment from 'moment'
import { ObjectID } from 'mongodb'
import { IContext } from '../types'

export const treatmentStateApp = async (_, args, { getDb }) => {
  const db = await getDb()

  let queryOne = {}
  let queryTwo = {}
  let sort = {}

  queryOne = {
    patientId: args.patientId,
    appointmentTime: { $gte: moment().toDate() },
  }
  queryTwo = {
    patientId: args.patientId,
    checkIn: true,
  }
  sort = {
    appointmentTime: 1,
  }

  let nextRecord = await db
    .collection('appointments')
    .find(queryOne)
    .sort(sort)
    .limit(1)
    .toArray()

  nextRecord = isEmpty(nextRecord) ? null : nextRecord[0]

  const historyRecords = await db
    .collection('treatmentState')
    .find(queryTwo)
    .sort(sort)
    .toArray()

  return { nextRecord, historyRecords }
}
