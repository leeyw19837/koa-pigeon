import { ObjectID } from 'mongodb'

export const TeamAppointments = {
  healthCareTeam: async (teamAppointment, _, { getDb }) => {
    const db = await getDb()
    return db.collection('healthCareTeams').findOne({
      _id: teamAppointment.healthCareTeamId,
    })
  },
}
