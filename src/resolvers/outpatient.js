import { ObjectID } from 'mongodb'

export const Outpatient = {
  patientsCount: async outpatient => {
    return outpatient.patientsId.length
  },
  hospitalName: async outpatient => {
    const { hospitalId, hospitalName } = outpatient
    let nickname = hospitalName
    if (hospitalId === 'BEIJING301') {
      nickname = '北京301'
    } else if (hospitalId === 'SHOUGANGYIYUAN') {
      nickname = '首钢医院'
    }
    return nickname
  },
  appointments: async outpatient => {
    const { appointmentsId } = outpatient
    return await db
      .collection('appointments')
      .find({
        _id: { $in: appointmentsId },
      })
      .sort({
        createdAt: -1,
      })
      .toArray()
  },
}
