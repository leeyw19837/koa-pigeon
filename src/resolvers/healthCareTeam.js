

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
    console.log(doctors, '@doctors')
    return doctors
  }
}
