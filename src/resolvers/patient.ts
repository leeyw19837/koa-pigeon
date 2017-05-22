export const Patient = {
  footAssessmentPhotos: async (patient, _, { db }) => {
    return db
      .collection('photos')
      .find({
        patientId: patient._id.toString(),
        owner: 'footAssessment',
      })
      .toArray()
  },
}
