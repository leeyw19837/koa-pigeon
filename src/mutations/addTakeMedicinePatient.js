import { ObjectID } from 'mongodb'

export const addTakeMedicinePatient = async (_, args, context) => {
  const { patientId } = args

  const patient = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
  })

  const getMedicine = {
    nickname: patient.nickname,
    healthCareTeamId: patient.healthCareTeamId,
    patientId,
    type: 'GET_MEDICINE',
    createdAt: new Date(),
  }

  await db.collection('event').insertOne(getMedicine)

  context.response.set('effect-types', 'addTakeMedicinePatient')
  return true
}

export const removeTakeMedicinePatient = async (_, args, context) => {
  const { itemId } = args

  await db
    .collection('event')
    .remove({ _id: ObjectID.createFromHexString(itemId) })

  context.response.set('effect-types', 'removeTakeMedicinePatient')
  return true
}

export const editTakeMedicinePatient = async (_, args, context) => {
  const { itemId, patientId } = args

  const patient = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
  })
  await db.collection('event').update(
    { _id: ObjectID.createFromHexString(itemId) },
    {
      $set: {
        nickname: patient.nickname,
        patientId: patientId,
      },
    },
  )
  context.response.set('effect-types', 'editTakeMedicinePatient')
  return true
}
