

export const HealthcareProfessional = {
  healthCareTeams: async (professional, _, { getDb }) => {
    const db = await getDb()

    return db
      .collection('healthCareTeams')
      .find({
        _id: {$in: professional.healthCareTeamId},
      })
      .toArray()
  },
  certifiedDiabetesEducator: async (professional, _, { getDb }) => {
    const db = await getDb()

    return await db.collection('certifiedDiabetesEducators').findOne({userId: professional._id})
  },
  // tags: async(hcp, _, {getDb}) => {
    
  // }
}
