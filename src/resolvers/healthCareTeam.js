import moment from 'moment'

export const HealthCareTeam = {
  institution: async (careTeam, _, { getDb }) => {
    const db = await getDb()

    return db
      .collection('institutions')
      .findOne({
        _id: careTeam.institutionId,
      })
  },
  healthCareProfessionals: async (careTeam, _, { getDb } ) => {
    const db = await getDb()

    const doctors = await db
      .collection('users').find({
        roles: '医生',
        healthCareTeamId: careTeam._id,
      }).toArray()
    // console.log(doctors, '@doctors')
    return doctors
  },
  availableAppointmentDates : async (careTeam, _, { getDb }) => {
    const db = await getDb()
    const availableAppointmentDates = await db
      .collection('outpatients')
      .find({state:'WAITING', hospitalId:careTeam.institutionId, outpatientDate:{$gte: moment().startOf('day').toDate()}})
      .sort({outpatientDate:1})
      .toArray()
    // console.log(availableAppointmentDates, '@availableAppointmentDates')
    return availableAppointmentDates
  }
}
