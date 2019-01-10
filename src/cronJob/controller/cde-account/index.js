import find from 'lodash/find'
import get from 'lodash/get'
import maxBy from 'lodash/maxBy'
import findIndex from 'lodash/findIndex'
import { ObjectID } from 'mongodb'

import { strip } from '../../../wechatPay/utils'

const getAllUsers = async () => {
  const patients = await db
    .collection('users')
    .find({
      patientState: 'ACTIVE',
      healthCareTeamId: { $nin: ['ihealthCareTeam', 'healthCareTeam4'] },
    })
    .toArray()
  return patients
}
const getAllCdes = async () => {
  const cdes = await db
    .collection('certifiedDiabetesEducators')
    .find({
      patientPercent: { $exists: true },
    })
    .toArray()
  return cdes
}
const getCdePercent = (hctId, cdes, currentHctPatients) => {
  const hctCdes = cdes.filter(o =>
    find(o.patientPercent, pp => pp.healthCareTeamId === hctId),
  )
  const result = {}
  result[hctId] = []
  const totalUserLength = currentHctPatients.length
  if (hctCdes.length === 1) {
    result[hctId].push({
      cdeId: hctCdes[0]._id,
      hadPatientCounts: totalUserLength,
      percent: 100,
      currentTotal: totalUserLength,
      needAddPatients: [],
    })
  } else if (hctCdes.length > 1) {
    hctCdes.forEach(cde => {
      const { _id, patientPercent } = cde
      const careUsers = currentHctPatients.filter(o => o.cdeId === _id)
      const percent =
        get(
          patientPercent.filter(o => o.healthCareTeamId === hctId),
          '0.percent',
        ) || 0
      result[hctId].push({
        cdeId: _id,
        hadPatientCounts: careUsers.length,
        percent,
        currentTotal: totalUserLength,
        needAddPatients: [],
      })
    })
  }
  return result
}
const groupPatientsByHctId = users => {
  const hctObj = {}
  users.forEach(user => {
    const { healthCareTeamId } = user
    if (healthCareTeamId && healthCareTeamId.length) {
      const hctId = healthCareTeamId[0]
      if (!hctObj[hctId]) {
        hctObj[hctId] = [user]
      } else {
        hctObj[hctId].push(user)
      }
    }
  })
  return hctObj
}
const getMaxDistancePercent = (currentHctCdePercent = []) => {
  const result = []
  currentHctCdePercent.forEach(cp => {
    const {
      hadPatientCounts,
      currentTotal,
      percent,
      needAddPatients,
      cdeId,
    } = cp
    const acutalTotal = currentTotal + needAddPatients.length
    const acutalHad = hadPatientCounts + needAddPatients.length
    const divisor =
      !acutalTotal && !acutalHad
        ? (acutalHad / acutalTotal * 100).toFixed(3)
        : 0
    result.push({
      cdeId,
      percentDistance: strip(percent - divisor),
    })
  })
  return maxBy(result, o => o.percentDistance)
}
const insertEvent = async (result, notCdeUsers) => {
  await db.collection('event').insert({
    _id: new ObjectID(),
    eventType: 'assign/patient',
    status: notCdeUsers.length ? 'Add' : 'noChange',
    newPatients: notCdeUsers.map(o => o._id),
    result,
    createdAt: new Date(),
  })
}
const dealWithDb = async (cdeId, patientIds) => {
  await db.collection('users').update(
    {
      cdeId: { $exists: false },
      _id: { $in: patientIds },
    },
    {
      $set: {
        cdeId,
        updatedAt: new Date(),
      },
    },
    {
      multi: true,
    },
  )
}
const setCdeIdForPatients = async assignPatients => {
  const cdes = []
  assignPatients.forEach(item => {
    const temp = {}
    const { categeryPatients } = item
    categeryPatients.forEach(cp => {
      const { needAddPatients, cdeId } = cp
      if (!temp[cdeId]) {
        temp[cdeId] = []
      }
      if (needAddPatients.length) {
        temp[cdeId].push(...needAddPatients.map(o => o._id))
      }
    })
    cdes.push(temp)
  })
  for (let index = 0; index < cdes.length; index++) {
    const cde = cdes[index]
    const cdeIds = Object.keys(cde)
    for (let i = 0; i < cdeIds.length; i++) {
      const patientIds = cde[cdeIds[i]]
      // console.log(patientIds, '~~~')
      if (patientIds.length) {
        await dealWithDb(cdeIds[i], patientIds)
      }
    }
  }
}

export const assignPatientToCde = async () => {
  const assignPatients = []
  const allUsers = await getAllUsers()
  const notCdeUsers = allUsers.filter(o => !o.cdeId)
  if (notCdeUsers.length) {
    const cdes = await getAllCdes()
    const hasCdeUsers = allUsers.filter(o => o.cdeId)
    const groupUsers = groupPatientsByHctId(notCdeUsers)
    Object.keys(groupUsers).forEach(hctId => {
      const currentHctPatients = hasCdeUsers.filter(
        o => o.healthCareTeamId.indexOf(hctId) !== -1,
      )
      const cdesPercent = getCdePercent(hctId, cdes, currentHctPatients)
      const currentHctNotCdePatients = groupUsers[hctId]
      if (currentHctNotCdePatients.length) {
        const temp = { healthCareTeamId: hctId }
        const currentHctCdePercent = cdesPercent[hctId]
        currentHctNotCdePatients.forEach(notCdePatients => {
          const maxDistancePercent = getMaxDistancePercent(currentHctCdePercent)
          const needAddIndex = findIndex(
            currentHctCdePercent,
            o => o.cdeId === maxDistancePercent.cdeId,
          )
          if (needAddIndex > -1) {
            currentHctCdePercent[needAddIndex].needAddPatients.push(
              notCdePatients,
            )
          }
        })
        temp.categeryPatients = currentHctCdePercent
        assignPatients.push(temp)
      }
    })
  }
  await setCdeIdForPatients(assignPatients)
  await insertEvent(assignPatients, notCdeUsers)
}
