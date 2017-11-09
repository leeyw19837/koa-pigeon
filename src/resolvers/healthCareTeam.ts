import { IContext } from '../types'

export const HealthCareTeam = {
  institution: async (careTeam, _, { getDb }: IContext) => {
    const db = await getDb()

    return db
      .collection('institutions')
      .findOne({
        _id: careTeam.institutionId,
      })
  },
}
