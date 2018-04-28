import { ObjectID } from 'mongodb'
const moment = require('moment')

export const getBgMeasureModules = async () => {
  return await db
    .collection('bgMeasureModule')
    .find({})
    .toArray()
}
export const getHcts = async () => {
  return await db
    .collection('healthCareTeams')
    .find({ disableTxt: { $ne: true } })
    .toArray()
}

export const getPatients = async (hctIds, aPatientsId) => {
  const defaultCursor = {
    healthCareTeamId: { $in: hctIds },
    patientState: 'ACTIVE',
    'dontDisturb.measureReminder': {
      $ne: true,
    },
  }
  if (aPatientsId.length) {
    defaultCursor._id = {
      $in: aPatientsId.map(o => ObjectID.createFromHexString(o)),
    }
  }
  return await db
    .collection('users')
    .find(defaultCursor)
    .toArray()
}

export const getMeasureModules = async (patientsId, compareDate) => {
  return await db
    .collection('measureModules')
    .find({
      patientId: { $in: patientsId },
      endAt: {
        $gt: moment(compareDate.startOf('day')).subtract(8, 'hours').format('YYYY-MM-DD'),
      },
    })
    .sort({ endAt: -1 })
    .toArray()
}
export const getBloodGlucoses = async (patientsId, compareDate) => {
  // TODO 调整时区，解决这个问题，并且删除代码 moment(compareDate.startOf('day')).subtract(8, 'hours')._d
  // TODO 调整时区，解决这个问题，并且删除代码
  // TODO 调整时区，解决这个问题，并且删除代码
  return await db
    .collection('bloodGlucoses')
    .find({
      patientId: { $in: patientsId },
      dataStatus: 'ACTIVE',
      measuredAt: {
        $gte: moment(compareDate.startOf('day')).subtract(8, 'hours')._d,
      },
    })
    .sort({ measuredAt: -1 })
    .toArray()
}
