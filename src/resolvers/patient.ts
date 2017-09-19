import { IContext } from '../types'

export const Patient = {
  footAssessmentPhotos: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()

    return db
      .collection('photos')
      .find({
        patientId: patient._id.toString(),
        owner: 'footAssessment',
      })
      .toArray()
  },
}
