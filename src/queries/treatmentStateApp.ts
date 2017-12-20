import { IContext } from '../types'
import { ObjectID } from 'mongodb'
import { isEmpty } from 'lodash'

export const treatmentStateApp = async(_,args,{getDb}:IContext)=>{
  const db = await getDb()

  let queryOne = {}
  let queryTwo = {}
  let sort = {}

  queryOne = {
    patientId:args.patientId
  }
  queryTwo = {
    patientId:args.patientId,
    checkIn:true
  }
  sort = {
    appointmentTime:-1
  }

  let nextRecord =  await db
  .collection('treatmentState')
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

  return {nextRecord,historyRecords}
}