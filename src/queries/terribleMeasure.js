import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import {maybeCreateFromHexString} from '../utils/maybeCreateFromHexString'
import { findIndex, indexOf } from 'lodash'
const moment = require('moment')

export const terribleMeasure = async (_, args, { getDb }) => {
  const db = await getDb()
  const startOfCurrentWeek = moment('2017-11-21').startOf('isoWeek')
  const startOfLastWeek = moment(startOfCurrentWeek._d).subtract(1, 'w')
  const endOfLastWeek = moment(startOfLastWeek._d).add(7, 'd')
  const queryTerribleMeasure = await db.collection('warnings').find({
    warningType: 'WITHOUT_MEASURE',
    $and:
        [
            { createdAt: { $gte: startOfLastWeek._d } },
            { createdAt: { $lte: endOfLastWeek._d } },
        ],
  }).sort({ createdAt: -1 }).toArray()
  // const formatData = await db.collection('bloodglucoses').aggregate([
  //   { $match: { 'createdAt' : { $gte: startOfLastWeek._d, $lte: endOfLastWeek._d } }},
  //   { $project: { _id: 1,
  //                 createdAt: 1,
  //                 patientId:1,
  //                 dinnerSituation:1,
  //                 week: {
  //                     $dayOfWeek: '$createdAt',
  //                 },
  //   } },
  //   { $group: { _id: '$patientId',
  //               data: { $push: "$$ROOT"},
  //               count: {$sum: 1},
  //               Monday: { $push: {
  //                         $cond: [ { $eq: [ "$week", 1 ] }, '$dinnerSituation', 'otherDay' ],
  //                       }},
  //               Tuesday: { $push: {
  //                          $cond: [ { $eq: [ "$week", 2 ] }, '$dinnerSituation', 'otherDay'  ],
  //                       }},
  //               Wednesday: { $push: {
  //                            $cond: [ { $eq: [ "$week", 3 ] }, '$dinnerSituation', 'otherDay'  ],
  //                       }},
  //               Thursday: { $push: {
  //                           $cond: [ { $eq: [ "$week", 4 ] }, '$dinnerSituation', 'otherDay'  ],
  //                       }},
  //               Friday: { $push: {
  //                         $cond: [ { $eq: [ "$week", 5 ] }, '$dinnerSituation', 'otherDay'  ],
  //                       }},
  //               Saturday: { $push: {
  //                           $cond: [ { $eq: [ "$week", 6 ] }, '$dinnerSituation', 'otherDay'  ],
  //                       }},
  //               Sunday: { $push: {
  //                         $cond: [ { $eq: [ "$week", 7 ] }, '$dinnerSituation', 'otherDay'  ],
  //                       }},
  //     }},
  //   ]).toArray()
  // const noPairList = []
  //
  // formatData.map((item) => {
  //   let pair = false
  //   for (let i = 1; i < 8; i++) {
  //     let pair = isPair(item[Week[i]])
  //     if (pair) {
  //       pair = true
  //       break
  //     }
  //   }
  //   if (pair === false) {
  //     noPairList.push(item)
  //   }
  // })
  // const oneWeekHaveMeasureUserList = await db.collection('bloodglucoses').find({
  //   $and:
  //   [
  //       { createdAt: { $gte: startOfLastWeek._d } },
  //       { createdAt: { $lte: endOfLastWeek._d } },
  //   ],
  // }).toArray()
  // const oneWeekHaveMeasureUserIds = oneWeekHaveMeasureUserList.map(measure => maybeCreateFromHexString(measure.author))
  // const noPairUserIds = noPairList.map(item => maybeCreateFromHexString(item._id))
  // const userList = await db.collection('users').find({
  //   patientState: 'ACTIVE',
  //   roles: { $exists: false },
  //   $or: [
  //    { _id: { $nin: oneWeekHaveMeasureUserIds } } ,
  //    { _id: { $in: noPairUserIds } },
  //   ],
  // }).toArray()
  // await Promise.all(userList.map(async(user)=>{
  //   const waringInfo = {
  //     patientId: user._id.toString(),
  //     warningType: 'WITHOUT_MEASURE',
  //     startAt: startOfLastWeek._d,
  //     endAt: endOfLastWeek._d,
  //     createdAt: new Date(),
  //     healthCareTeamId: user.healthCareTeamId ? user.healthCareTeamId[0]: '',
  //   }
  //   const ishaveCounts = findIndex(noPairList, patient => patient._id === user._id.toString())
  //   if (ishaveCounts > 0) {
  //     waringInfo.count = noPairList[ishaveCounts].count
  //   } else {
  //     waringInfo.count = 0
  //   }
  //   await db.collection('warnings').insertOne(waringInfo)
  // }))
  return queryTerribleMeasure
}
