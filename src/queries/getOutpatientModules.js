import { ObjectId } from 'mongodb'
const moment = require('moment')

export const getOutpatientModules = async (_, args, context) => {
  const { hospitalId } = args
  const db = await context.getDb()
  return await db.collection('outpatientModules').find({ hospitalId }).toArray()
}