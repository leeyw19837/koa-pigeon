import freshId from 'fresh-id'
const moment = require('moment')

export const addAppointment = async (_, args, context) => {
  context.response.set('effect-types', 'Appointment,DailyAppointment')
  return true
}
