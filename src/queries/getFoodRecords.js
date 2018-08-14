import moment from 'moment'
import {
  GraphQLError
} from 'graphql';

export const getFoodRecords = async (_, args, context) => {
  const db = await context.getDb()
  const user = context.userInfo
  console.log('getFoodRecords', user)
  if (!user) {
    throw new GraphQLError(
      'AuthenticationError',
    );
  }
  const {
    patientId,
    cdeId
  } = args
  const cursor = {}
  if (patientId) cursor.patientId = patientId

  if (cdeId) {
    const patientIds = await db
      .collection('users')
      .find({
        cdeId,
        patientState: 'ACTIVE'
      })
      .map(patient => patient._id.toString())
    cursor.patientId = {
      $in: patientIds,
    }
  }
  let foods = await db
    .collection('foods')
    .find(cursor)
    .sort({
      createdAt: -1
    })
    .toArray()
  return foods
}