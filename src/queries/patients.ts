import { ObjectID } from 'mongodb'
import { IContext } from '../types'

export const patient = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  if (args.patientId) {
    return db.collection('users').findOne({
      _id: ObjectID.createFromHexString(args.patientId),
      patientState: { $exists: 1 },
    })
  }
  return db.collection('users').findOne({
    username: `${args.telephone}@ijk.com`,
    patientState: { $exists: 1 },
  })
}

export const patients = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  return db
    .collection('users')
    .find({
      patientState: { $nin: ['REMOVED', 'ARCHIVE'] },
      roles: { $exists: 0 },
    })
    .toArray()
}

export const patientsByStatus = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  return db
    .collection('users')
    .find({ status: args.status })
    .toArray()
}

export const healthCareProfessional = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  return db
    .collection('users')
    .findOne({ _id: args.id, patientState: { $exists: 0 } })
}

export const healthCareProfessionals = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  return db
    .collection('users')
    .find({ patientState: { $exists: 0 } })
    .toArray()
}

export const latestCaseRecordBeforeDate = async (
  _,
  args,
  { getDb }: IContext,
) => {
  const db = await getDb()
  const { patientId, now } = args
  const cr = await db
    .collection('caseRecord')
    .find({ patientId, createdAt: { $lt: now } })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray()
  if (!!cr.length) return cr[0]
  return null
}
