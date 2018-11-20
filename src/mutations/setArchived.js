import {ObjectId} from 'mongodb'
import {createQuarterReplaceAddition} from './appointment';
import {get} from 'lodash'

export const setArchived = async (_, params, context) => {
  const {patientId, archivedReason, archivedInfo} = params

  const userObjectId = ObjectId.createFromHexString(patientId)

  const patient = await db
    .collection('users')
    .findOne({_id: userObjectId})

  if (!patient) {
    throw new Error('Patient is not existed!')
  }

  const appointments = await db.collection('appointments').find({patientId: patientId, isOutPatient: false}).toArray()
  const user = await db.collection('users').findOne({_id: userObjectId})
  const archivedInfos = get(user, "archivedInfos", [])
  archivedInfos.unshift({...archivedInfo, archivedDate: [new Date()]})
  await db
    .collection('users')
    .update({
      _id: userObjectId
    }, {
      $set: {
        patientState: 'ARCHIVED',
        reapplyStatus: 'NOT_APPLIED',
        archivedReason: archivedReason,
        archivedInfos
      }
    })

  await db
    .collection('appointments')
    .update({
        _id: {
          $in: appointments.map(a => {
            return a._id
          })
        }
      }, {
        $set: {
          patientState: 'ARCHIVED',
          archivedReason: archivedReason,
          archivedInfos
        },
      }, {
        multi: true,
      }
    )

  await db
    .collection('treatmentState')
    .update({
        _id: {
          $in: appointments.map(a => {
            return a.treatmentStateId
          })
        }
      }, {
        $set: {
          patientState: 'ARCHIVED',
          archivedReason: archivedReason,
          archivedInfos
        },
      }, {
        multi: true,
      }
    )

  await db
    .collection('outpatients')
    .update({
        state: 'WAITING',
        appointmentsId: {
          $in: appointments.map(a => {
            return a._id
          })
        }
      }, {
        $pull: {
          appointmentsId: {
            $in: appointments.map(a => {
              return a._id
            })
          },
          patientsId: patientId,
        },
        $set: {
          updatedAt: new Date(),
        },
      }, {
        multi: true,
      }
    )
  // console.log("-------->>>>>>>>setArchived", appointmentsId + "------" + patientsId)

  context
    .response
    .set('effect-types', 'Patient')
  return true
}

export const unsetArchived = async (_, params, context) => {
  const {patientId, outpatientId, appointmentTime} = params

  const userObjectId = ObjectId.createFromHexString(patientId)
  const patient = await db
    .collection('users')
    .findOne({_id: userObjectId})

  if (!patient) {
    throw new Error('Patient is not existed!')
  }

  const archivedInfos = get(patient, "archivedInfos", [])

  const archivedInfo = {
    archivedType: 'UNARCHIVED',
    archivedSubType: [],
    archivedReason: "",
    archivedDate: [new Date()]
  }
  archivedInfos.unshift(archivedInfo)
  await db
    .collection('users')
    .update({
      _id: userObjectId
    }, {
      $set: {
        patientState: 'ACTIVE',
        reapplyStatus: 'NOT_APPLIED',
        archivedInfos,
      }
    })

  await createQuarterReplaceAddition(null, {patientId, outpatientId, appointmentTime})

  context
    .response
    .set('effect-types', 'Patient')
  return true
}
