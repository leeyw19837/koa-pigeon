import { ObjectID } from 'mongodb'

export const TreatmentStateRecord = {
  healthCareTeam: async (tsr, _, { getDb }) => {
    const db = await getDb()
    return await db.collection('healthCareTeams').findOne({
      _id: tsr.healthCareTeamId
    })
  }
}
