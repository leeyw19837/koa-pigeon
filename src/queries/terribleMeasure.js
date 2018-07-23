import { ObjectID } from 'mongodb'

import { maybeCreateFromHexString } from '../utils/maybeCreateFromHexString'
import { findIndex, indexOf } from 'lodash'
const moment = require('moment')

export const terribleMeasure = async (_, args, { getDb }) => {
  const db = await getDb()
  // const startOfCurrentWeek = moment().startOf('isoWeek')
  const startOfLastWeek = moment().startOf('isoWeek')
  const endOfLastWeek = moment(startOfLastWeek._d).add(7, 'd')
  const queryTerribleMeasure = await db
    .collection('warnings')
    .find({
      warningType: 'WITHOUT_MEASURE',
      $and: [
        { createdAt: { $gte: startOfLastWeek._d } },
        { createdAt: { $lte: endOfLastWeek._d } },
      ],
    })
    .toArray()
  return queryTerribleMeasure
}
