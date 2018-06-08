import { ObjectID } from 'mongodb'

export const Outpatient = {
  patientsCount: async outpatient => {
    return outpatient.patientsId.length
  },
}
