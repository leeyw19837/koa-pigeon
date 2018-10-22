import { ObjectId } from 'mongodb'

export const setArchived = async (_, params, context) => {
	const { patientId, archivedReason } = params

	const userObjectId = ObjectId.createFromHexString(patientId)

	//console.log("-------->>>>>>>>setArchived", userObjectId + "------" + archivedReason)

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
	context
		.response
		.set('effect-types', 'setArchived')
	return true
}

export const unsetArchived = async (_, params, context) => {
	const { patientId, appointmentTime } = params

	const userObjectId = ObjectId.createFromHexString(patientId)
	const patient = await db
		.collection('users')
		.findOne({ _id: userObjectId })

	if (!patient) {
		throw new Error('Patient is not existed!')
	}

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

	await db.collection('appointments').insert({
		_id: new ObjectID().toString(),
		patientId: patientId.toString(),
		...params,
	})

	context
		.response
		.set('effect-types', 'unsetArchived')
	return true
}
