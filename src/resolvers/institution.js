import moment from "moment";
import { sortBy } from 'lodash'

export const HospitalMessage = {
  appointmentDates:
    async (institution, _, { getDb }) => {
      const db = await getDb()
      const availableAppointmentDates = await db
        .collection('outpatients')
        .distinct('outpatientDate', {
          state: 'WAITING',
          hospitalId: institution._id,
          outpatientDate: { $gte: moment().startOf('day').toDate() }
        })
      const dateArray = sortBy(
        availableAppointmentDates, (o) => {
          return moment(o)
        }).map((item) => {
        return moment(item).format('YYYY-MM-DD')
      }).slice(0, 10)
      return dateArray
    }
}
