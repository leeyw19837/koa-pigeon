import { ObjectId } from "mongodb";

/**
 * 查询未入组患者下面的医院介绍
 * */
export const getHospitalMessage = async (_, args) => {
  const { patientId } = args
  const user = await db
    .collection('users')
    .findOne({
      _id: ObjectId.createFromHexString(patientId)
    })
  const { institutionId = "", healthCareTeamId = [] } = user
  if (healthCareTeamId.length !== 0) {
    return []
  } else if (institutionId) {
    const hospitalMessage = await db
      .collection('institutions')
      .find({
        _id: institutionId,
        isPartner: true,
      }, {
        password: 0,
      }).toArray()
    return hospitalMessage
  } else {
    const hospitalMessage = await db
      .collection('institutions')
      .find({
        isPartner: true,
      }, {
        password: 0,
      }).toArray()
    return hospitalMessage
  }
  
}
