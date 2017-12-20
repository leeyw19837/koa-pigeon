import { IContext } from '../types'

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

  const nextRecord =  await db
  .collection('treatmentState')
  .find(queryOne)
  .sort(sort)
  .limit(1)
  .toArray()[0]

  const historyRecords = await db
  .collection('treatmentState')
  .find(queryTwo)
  .sort(sort)

  return [nextRecord,historyRecords]
}