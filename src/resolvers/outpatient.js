import { ObjectID } from 'mongodb'
import moment from 'moment'

export const Outpatient = {
  patientsCount: async outpatient => {
    const patientLength = await db.collection('users').count({
      _id: { $in: outpatient.patientsId.map(o => ObjectID(o)) },
      patientState: 'ACTIVE',
    })
    return patientLength
  },
  hospitalName: async outpatient => {
    const { hospitalId, hospitalName } = outpatient
    let nickname = hospitalName
    if (hospitalId === 'BEIJING301') {
      nickname = '北京301'
    } else if (hospitalId === 'SHOUGANGYIYUAN') {
      nickname = '首钢医院'
    }
    return nickname
  },
  appointments: async outpatient => {
    const { appointmentsId } = outpatient
    return await db
      .collection('appointments')
      .find({
        _id: { $in: appointmentsId },
        patientState: { $nin: ['ARCHIVED', 'REMOVED'] },
      })
      .sort({
        createdAt: -1,
      })
      .toArray()
  },
  availableAppointmentDates: async outpatient => {
    const { healthCareTeamId } = outpatient
    const result = await db
      .collection('outpatients')
      .find({
        healthCareTeamId,
        state: 'WAITING',
        outpatientDate: {
          $gt: moment()
            .subtract(1, 'days')
            .endOf('day')._d,
        },
      })
      .sort({
        outpatientDate: 1,
      })
      .toArray()
    return result
  },
  treatmentStates: async outpatient => {
    const { appointmentsId } = outpatient
    const treatmentIds = await db
      .collection('appointments')
      .distinct('treatmentStateId', {
        _id: { $in: appointmentsId },
      })
    console.log(treatmentIds, '@treatmentIds')
    let treatmentStatesArray = await db
      .collection('treatmentState')
      .find({
        _id: { $in: treatmentIds },
        patientState: { $nin: ['ARCHIVED', 'REMOVED'] },
      })
      .sort({
        createdAt: -1,
      })
      .toArray()

    const bgLists = await db
      .collection('bloodGlucoses')
      .find({
        patientId: { $in: treatmentStatesArray.map(p => p.patientId) },
        measuredAt: { $gte: moment().subtract(7, 'days')._d },
        dataStatus: 'ACTIVE',
      })
      .toArray()
    treatmentStatesArray = treatmentStatesArray.map(t => {
      const measureCounts = bgLists.filter(o => o.patientId === t._id.valueOf())
      return { ...t, measureCounts: measureCounts.length }
    })

    if (treatmentStatesArray && treatmentStatesArray.length > 0) {
      for (let i = 0; i < treatmentStatesArray.length; i++) {
        const patientId = treatmentStatesArray[i].patientId
        if (patientId) {
          const BG1NotUseReasonArray = await db
            .collection('BG1NotUseReason')
            .find({ patientId })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray()
          treatmentStatesArray[i].BG1NotUseReason = BG1NotUseReasonArray
        } else {
          treatmentStatesArray[i].BG1NotUseReason = []
        }
      }
    }

    return treatmentStatesArray
  },
}
