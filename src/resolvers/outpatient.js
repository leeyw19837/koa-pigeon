import { ObjectID } from 'mongodb'
import moment from 'moment'

export const Outpatient = {
  patientsCount: async outpatient => {
    return outpatient.patientsId.length
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
}
