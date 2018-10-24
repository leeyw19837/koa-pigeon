import { ObjectId } from 'mongodb'
import { createQuarterReplaceAddition } from './appointment';

export const setArchived = async (_, params, context) => {
  const { patientId, archivedReason } = params

  const userObjectId = ObjectId.createFromHexString(patientId)

  const patient = await db
    .collection('users')
    .findOne({ _id: userObjectId })

  if (!patient) {
    throw new Error('Patient is not existed!')
  }

  const appointments = await db.collection('appointments').find({ patientId: patientId, isOutPatient: false }).toArray()
  await db
    .collection('users')
    .update({
      _id: userObjectId
    }, {
        $set: {
          patientState: 'ARCHIVED',
          archivedReason: archivedReason,
        }
      })

  await db
    .collection('appointments')
    .update({
      _id: {
        $in: appointments.map(a => { return a._id })
      }
    }, {
        $set: {
          patientState: 'ARCHIVED',
          archivedReason: archivedReason,
        },
      }, {
        multi: true,
      }
    )

  await db
    .collection('treatmentState')
    .update({
      _id: {
        $in: appointments.map(a => { return a.treatmentStateId })
      }
    }, {
        $set: {
          patientState: 'ARCHIVED',
          archivedReason: archivedReason,
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
        $in: appointments.map(a => { return a._id })
      }
    }, {
        $pull: {
          appointmentsId: { $in: appointments.map(a => { return a._id }) },
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
    .set('effect-types', 'setArchived')
  return true
}

export const unsetArchived = async (_, params, context) => {
  const { patientId, mgtOutpatientId, mgtAppointmentTime } = params

  const userObjectId = ObjectId.createFromHexString(patientId)
  const patient = await db
    .collection('users')
    .findOne({ _id: userObjectId })

  if (!patient) {
    throw new Error('Patient is not existed!')
  }

  await db
    .collection('users')
    .update({
      _id: userObjectId
    }, {
        $set: {
          patientState: 'ACTIVE',
        }
      })

  await createQuarterReplaceAddition(null, { patientId, mgtOutpatientId, mgtAppointmentTime })

  context
    .response
    .set('effect-types', 'unsetArchived')
  return true
}
