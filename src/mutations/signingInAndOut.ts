import moment = require('moment')
import { ObjectID } from 'mongodb'


export default {
  signInPatient: async (_, args, { db }) => {
    const { patientId } = args
    const StartOfDay = moment().startOf('day').toDate()
    const EndOfDay = moment().endOf('day').toDate()
    const evtExists = await db.collection('event').findOne({
      patientId,
      createdAt: { $gte: StartOfDay, $lt: EndOfDay },
      type: 'attendence/signIn',
      isSignedOut: false,
    })
    const treatmentStateExists = await db.collection('treatmentState').findOne({
      patientId,
      appointmentTime: { $gte: StartOfDay, $lt: EndOfDay },
    })
    console.log({treatmentStateExists})
    if (!evtExists && treatmentStateExists) {
      const modifyResult = await db.collection('event').insert({
        patientId,
        createdAt: new Date(),
        type: 'attendence/signIn',
        isSignedOut: false,
      })
      // Mark attendence on treatmentState

      const treatmentStateModifyRes = await db.collection('treatmentState').update({
        patientId,
        appointmentTime: { $gte: StartOfDay, $lt: EndOfDay },
      }, {
        $set: {
          app: true,
        },
      })

      const setIsDonee = await db.collection('users').update({
        _id: new ObjectID(patientId),
      }, {
        $set: {
          isDonee: true,
          latestTSID: treatmentStateExists._id,
        },
      })

      return {
        eventRes: modifyResult.ops[0],
        checkInRes: treatmentStateModifyRes.result.ok,
        setIsDonee: setIsDonee.result.ok,
      }
    } else return
  },
  signOutPatient: async (_, args, { db }) => {
    const { patientId } = args
    const modifyResult = await db.collection('event').update({
      patientId,
      type: 'attendence/signIn',
      isSignedOut: false,
    }, {
      $set: {
        signOutAt: new Date(),
        isSignedOut: true,
      },
    })
    return {isSignedOut: modifyResult.result.ok}
  },
}
