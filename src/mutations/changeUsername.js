import { ObjectID } from 'mongodb'
import { IContext } from '../types'

export const changeUsername = async (_, args, context) => {
  const db = await context.getDb()
  const { patientId, newUsername } = args
  console.log(args)
  const old = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
    patientState: { $exists: 1 },
  })

  const newNum = await db.collection('users').findOne({
    username: args.newUsername,
    patientState: { $exists: 1 },
  })
  //   console.log(old, newNum)
  let updateObi = {
    username: newUsername,
  }
  if (newNum) {
    if (newNum.patientState === 'ACTIVE') {
      return false
    } else {
      if (!old.wechatInfo && newNum.wechatInfo) {
        updateObi.wechatInfo = newNum.wechatInfo
      }
      await db
        .collection('bloodglucoses')
        .find({
          author: newNum._id.toString(),
        })
        .forEach(function(bg) {
          db.collection('bloodglucoses').update(
            {
              _id: bg._id,
            },
            {
              $set: {
                author: old._id.toString(),
              },
            },
          )
        })
      await db.collection('users').remove({ username: newUsername })
    }
  }
  const newResult = await db.collection('users').update(
    {
      _id: ObjectID.createFromHexString(patientId),
    },
    {
      $set: {
        username: newUsername,
      },
    },
  )
  return true
}
