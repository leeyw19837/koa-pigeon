import { ObjectID } from 'mongodb'

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
        $gt: compareDate.format('YYYY-MM-DD'),
      },
    })
    .sort({ endAt: -1 })
    .toArray()
}
export const getBloodGlucoses = async (patientsId, compareDate) => {
  return await db
    .collection('bloodGlucoses')
    .find({
      patientId: { $in: patientsId },
      dataStatus: 'ACTIVE',
      measuredAt: {
        $gte: compareDate.startOf('day')._d,
      },
    })
    .sort({ measuredAt: -1 })
    .toArray()
}
