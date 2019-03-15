import { ObjectId } from "mongodb";

/**
 * 查询未入组患者下面的医院介绍
 * */
export const getHospitalMessage = async (_, args) => {
  const { patientId, coordinate = {} } = args
  console.log('coordinate', coordinate)
  const user = await db
    .collection('users')
    .findOne({
      _id: ObjectId.createFromHexString(patientId)
    })
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
    // 如果没有用户的地理位置信息，默认北大医院的坐标
    let { longitude, latitude } = coordinate
    if (!longitude || !latitude) {
      longitude = 116.380702
      latitude = 39.931959
    }
    const nearHospital = await db
      .collection('institutions')
      .findOne({
        isPartner: true,
        location:
          {
            $near: {
              $geometry: { type: "Point", coordinates: [longitude, latitude] },
            }
          },
      },)
    
    const hospitalList = await db
      .collection('institutions')
      .find({
        isPartner: true,
        _id: { $ne: nearHospital._id }
      }, {
        password: 0,
      }).sort({ recommendDegree: 1 }).toArray()
    hospitalMessage = [nearHospital, ...hospitalList]
  }
  return hospitalMessage
}
