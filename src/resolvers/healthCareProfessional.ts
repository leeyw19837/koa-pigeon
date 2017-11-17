import { IContext } from '../types'

export const HealthcareProfessional = {
  healthCareTeams: async (professional, _, { getDb }: IContext) => {
    const db = await getDb()

    return db
      .collection('healthCareTeams')
      .find({
        _id: {$in: professional.healthCareTeamId},
      })
      .toArray()
  },
}
