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
  console.log("user", user)
  const { institutionId = "", healthCareTeamId = [] } = user
  let hospitalMessage = [];
  if (healthCareTeamId.length !== 0) {
    return hospitalMessage
  } else if (institutionId) {
    hospitalMessage = await db
      .collection('institutions')
      .find({
        _id: institutionId,
        isPartner: true,
      }, {
        password: 0,
      }).sort({ recommendDegree: 1 }).toArray()
    
  } else {
    hospitalMessage = await db
      .collection('institutions')
      .find({
        isPartner: true,
      }, {
        password: 0,
      }).sort({ recommendDegree: 1 }).toArray()
  }
  console.log("hospitalMessage", hospitalMessage)
  return hospitalMessage
}
