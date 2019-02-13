import get from 'lodash/get'
import { ObjectId } from 'mongodb'

export const getUserInfo = async ctx => {
  const patientId = get(ctx, 'request.query.patientId', '')
  let result = 'PatientId not existed!'
  try {
    if (patientId) {
      result = await db
        .collection('users')
        .findOne({ _id: ObjectId.createFromHexString(patientId) })
    }
  } catch (error) {
    console.log('error')
  }
  return result
}
