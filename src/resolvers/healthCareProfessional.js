

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
  planToAppointPatients: async (professional, _, { getDb }) => {
    const db = await getDb()
    const healthCareTeams = await db
      .collection('healthCareTeams')
      .find({})
      .toArray()
    let responsibleHCTIds = professional.healthCareTeamId
    let responsibleHealthCareTeams = []
    responsibleHCTIds.forEach(i=>responsibleHealthCareTeams.push(healthCareTeams.find(j=>i===j._id)))
    const responsibleHCTInstitutionIds = responsibleHealthCareTeams.map(i=>i.institutionId)
    const planToAppointRecordsDb = await db
      .collection('appointments')
      .find({ appointmentTime:{$exists:0}, expectedTime:{$exists:true}, institutionId: {$in: responsibleHCTInstitutionIds}})
      .sort({ expectedTime: -1 })
      .toArray()
    // fix a bug: convert expectedTime to Date if it's a String value
    const planToAppointRecords = planToAppointRecordsDb.map(i=>({...i, expectedTime: new Date(i.expectedTime)}))
    return {
      healthCareTeams: responsibleHealthCareTeams,
      planToAppointRecords
    }
  },

}
