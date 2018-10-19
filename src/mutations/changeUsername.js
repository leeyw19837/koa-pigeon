import { ObjectID } from 'mongodb'

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
    if (
      newNum.patientState === 'ACTIVE' ||
      newNum.patientState === 'HAS_APPOINTMENT'
    ) {
      return false
    } else {
      if (!old.wechatInfo && newNum.wechatInfo) {
        updateObi.wechatInfo = newNum.wechatInfo
      }
      await db
        .collection('bloodGlucoses')
        .find({
          patientId: newNum._id.toString(),
        })
        .forEach(function(bg) {
          db.collection('bloodGlucoses').update(
            {
              _id: bg._id,
            },
            {
              $set: {
                patientId: old._id.toString(),
              },
            },
            { multi: true },
          )
        })
      await db.collection('appointments').update(
        {
          patientId: newNum._id.toString(),
        },
        {
          $set: {
            patientState: 'REMOVED',
          },
        },
        { multi: true },
      )
      await db.collection('treatmentState').update(
        {
          patientId: newNum._id.toString(),
        },
        {
          $set: {
            status: 'delete',
          },
        },
        { multi: true },
      )
      const removeUsername =
        newUsername.split('').join('-') + '@hadChangeUserName'
      await db.collection('users').update(
        {
          _id: newNum._id,
        },
        {
          $set: {
            patientState: 'REMOVED',
            username: removeUsername,
          },
        },
      )
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
  const changeAppoitmentMobile = await db.collection('appointments').update(
    {
      patientId,
      appointmentTime: { $gte: new Date() },
    },
    {
      $set: {
        mobile: newUsername,
      },
    },
    { multi: true },
  )
  return true
}
