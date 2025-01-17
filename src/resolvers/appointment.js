import { ObjectID } from 'mongodb'
import moment from 'moment'

export const TeamAppointments = {
  healthCareTeam: async (teamAppointment, _, { getDb }) => {
    const db = await getDb()
    return db.collection('healthCareTeams').findOne({
      _id: teamAppointment.healthCareTeamId,
    })
  },
}

export const Appointment = {
  inValueRange: async (appointment, _, { getDb }) => {
    const db = await getDb()
    const { patientId, type } = appointment
    let timeRange = []
    if (type === 'first') return timeRange
    const latestAp = await db
      .collection('appointments')
      .find({
        patientId,
        isOutPatient: true,
        patientState: { $ne: 'ARCHIVED' },
        type: { $ne: 'addition' },
      })
      .sort({
        appointmentTime: -1,
      })
      .limit(1)
      .toArray()
    if (latestAp[0]) {
      const { appointmentTime } = latestAp[0]
      timeRange = [
        moment(appointmentTime)
          .add(75, 'days')
          .startOf('day')._d,
        moment(appointmentTime)
          .add(112, 'days')
          .endOf('day')._d,
      ]
    }
    return timeRange
  },
  hospitalName: async (appointment, _, { getDb }) => {
    const db = await getDb()
    const { institutionId } = appointment
    const hospital = await db
      .collection('institutions')
      .findOne({ _id: institutionId })
    if (hospital) {
      return hospital.fullname
    }
    return ""
  },

}
