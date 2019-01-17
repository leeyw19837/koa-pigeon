import {find} from 'lodash';

export const PublicityActivityController = {
  activity: async (pubActCon, _, {getDb}) => {
    const db = await getDb()
    const activityId = pubActCon.activity.map((item) => {
      return item._id
    })
    let publicityActivity = await db.collection('publicityActivity').find({
      _id: {$in: activityId},
      expiredTime: {$gt: new Date()},
      state:'AVAILABLE'
    })
      .sort({priority: 1})
      .toArray()
    publicityActivity = publicityActivity.map(item => {
      const matchedA = find(pubActCon.activity, a => a._id === item._id)
      return {...matchedA, ...item}
    })
    return publicityActivity
  },
}
