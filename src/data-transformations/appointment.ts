export const transformAppointment = old => ({
  date: old.appointmentTime,
  didFinishFootAssessment: old.footAt,
})