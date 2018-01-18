import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import {maybeCreateFromHexString} from '../utils/maybeCreateFromHexString'
import { findIndex, indexOf } from 'lodash'
const moment = require('moment')

export const terribleMeasure = async (_, args, { getDb }) => {
  const db = await getDb()
  const startOfCurrentWeek = moment().startOf('isoWeek')
  const startOfLastWeek = moment(startOfCurrentWeek._d).subtract(1, 'w')
  const endOfLastWeek = moment(startOfLastWeek._d).add(7, 'd')
  const queryTerribleMeasure = await db.collection('warnings').find({
    warningType: 'WITHOUT_MEASURE',
    $and:
        [
            { createdAt: { $gte: startOfLastWeek._d } },
            { createdAt: { $lte: endOfLastWeek._d } },
        ],
  }).toArray()
  return queryTerribleMeasure
}
