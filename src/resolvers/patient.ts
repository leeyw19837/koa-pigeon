import { IContext } from '../types'
const moment = require('moment')

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
  needleChatRoom: async (patient, _, { getDb }: IContext) => {
    const db = await getDb()

    return db
      .collection('needleChatRooms')
      .findOne({
        _id: patient.needleChatRoomId,
      })
  },
  closestAppointment: async(patient, _, { getDb }: IContext) => {
    const db = await getDb()
    const endOfToday = moment().endOf('day')._d
    const result = await db.collection('appointments').find({
      patientId: patient._id.toString(),
      status: 0,
      appointmentTime: {
        $gt: endOfToday,
      },
    }).sort({appointmentTime: 1}).toArray()
    return result[0] || null
  },
  communications: async(patient, _, { getDb }: IContext) => {
    const db = await getDb()
    
    return db
      .collection('communication')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1})
      .toArray()
  },
}
