import moment from "./healthCareTeam";

export const HospitalMessage = {
  appointmentDates:
    async (institution, _, { getDb }) => {
      const db = await getDb()
      
      const availableAppointmentDates = await db
        .collection('outpatients')
        .find({
          state: 'WAITING',
          hospitalId: institution._id,
          outpatientDate: { $gte: moment().startOf('day').toDate() }
        }, { outpatientDate: 1 })
        .sort({ outpatientDate: 1 })
        .toArray()
      const dateArray = availableAppointmentDates.map((item) => {
        return moment(item).format('YYYY-MM-DD')
      })
      console.log('@availableAppointmentDates', dateArray)
      
      return availableAppointmentDates
    }
}
