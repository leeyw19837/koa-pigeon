import freshId from 'fresh-id'
import transform from 'lodash/transform'
const moment = require('moment')

export const addOutHospitalSoap = async(_, args, context) => {
    const db= await context.getDb()
    const { subjective, objective, assessment, plan, severity, patientId, nextCommunicationDate } = args
    let result = await db.collection('outHospitalSoap').insert({
        _id: freshId(),
        subjective,
        objective,
        assessment,
        plan,
        severity,
        patientId,
        nextCommunicationDate,
        operator: {
            _id: '66728d10dc75bc6a43052036',
        },
        createdAt: new Date(),
    })
    if(!!result.result.ok){
        result = await db.collection('outreachs').update({
            patientId,
            status: 'PENDING',
            // appointmentTime: {$gte: startOfToday} // 与水清沟通后决定先去除
          }, {$set: {status: 'PROCESSED'}}, {multi: true})
    
        result = await db.collection('warnings').update({
            isHandle: {$ne: true},
            patientId
        }, {$set: {
            isHandle: true
        }}, {multi: true})

        if (nextCommunicationDate) {
            const newOutreachs = {
              _id: freshId(),
              patientId,
              status: 'PENDING',
              source: ['communication'],
              plannedDate: moment(nextCommunicationDate).startOf('day')._d,
              createdAt: new Date(),        
            }
            await db.collection('outreachs').insertOne(newOutreachs)
          }
        return !!result.result.ok
    }
    return false
}

export const updateOutHospitalSoap = async (_, args, context) => {
  const db = await context.getDb()

  const { _id, subjective, objective, assessment, plan, severity, nextCommunicationDate } = args

  const result = await db.collection('outHospitalSoap').update(
      {_id},
      {$set: {
          subjective,
          objective,
          assessment,
          plan,
          severity,
          nextCommunicationDate,
      }}
  )
  return !!result.result.ok
  }
  
  export const removeOutHospitalSoap = async (_, { _id }, context) => {
    const db = await context.getDb()
  
    const result = await db.collection('outHospitalSoap').remove({ _id })
    return !!result.result.ok
  }
  