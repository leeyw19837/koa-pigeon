import moment from 'moment'
import { ObjectId } from 'mongodb'
export const getOpModules = async outpatientModuleIds => {
  const cursor = {
    'dontDisturb.examineReminder': { $ne: true },
  }
  if (outpatientModuleIds && outpatientModuleIds.length) {
    cursor._id = { $in: outpatientModuleIds }
  }
  const opModules = await db
    .collection('outpatientModules')
    .find(cursor)
    .toArray()
  return opModules
}

export const getNextOutpatients = async nextDays => {
  const tomorrowDate = moment().add(nextDays || 1, 'days')
  const startAt = moment(tomorrowDate).startOf('day')._d
  const endAt = tomorrowDate.endOf('day')._d
  const outpatients = await db
    .collection('outpatients')
    .find({
      state: 'WAITING',
      outpatientDate: {
        $gte: startAt,
        $lt: endAt,
      },
    })
    .toArray()
  const opModules = await getOpModules()
  const filterOpModuleIds = opModules.map(o => o._id)
  const filterOutpatients = outpatients.filter(
    op => filterOpModuleIds.indexOf(op.outpatientModuleId) !== -1,
  )
  return filterOutpatients
}

export const getAppointments = async appointmentIds => {
  const appointments = await db
    .collection('appointments')
    .find({
      _id: { $in: appointmentIds },
      patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
    })
    .toArray()
  return appointments
}

export const getPatients = async patientIds => {
  const patients = await db
    .collection('users')
    .find({
      _id: { $in: patientIds.map(o => ObjectId(o)) },
      patientState: { $in: ['HAS_APPOINTMENT', 'ACTIVE'] },
    })
    .toArray()
  return patients
}

export const PeriodMap = {
  MORNING: '上午',
  AFTERNOON: '下午',
}
