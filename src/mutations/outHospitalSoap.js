import freshId from 'fresh-id'
import transform from 'lodash/transform'

export const addOutHospitalSoap = async(_, args, context) => {
    const db= await context.getDb()
    const { subjective, objective, assessment, plan, severity, patientId } = args
    const result = await db.collection('outHospitalSoap').insert({
        _id: freshId(),
        subjective,
        objective,
        assessment,
        plan,
        severity,
        patientId,
        operator: {
            _id: '66728d10dc75bc6a43052036',
        },
        createdAt: new Date(),
    })
    return !!result.result.ok
}

export const updateOutHospitalSoap = async (_, args, context) => {
  const db = await context.getDb()

  const { _id, subjective, objective, assessment, plan, severity } = args

  const result = await db.collection('outHospitalSoap').update(
      {_id},
      {$set: {
          subjective,
          objective,
          assessment,
          plan,
          severity,
      }}
  )
  return !!result.result.ok
  }
  
  export const removeOutHospitalSoap = async (_, { _id }, context) => {
    const db = await context.getDb()
  
    const result = await db.collection('outHospitalSoap').remove({ _id })
    return !!result.result.ok
  }
  