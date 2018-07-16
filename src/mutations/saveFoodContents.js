import {uploadBase64Img} from "../utils/ks3";

export const saveFoodContents = async (_, args, context) => {

  const db = await context.getDb()
  const {patientId, circleContent, circleImageBase64, measurementTime, measuredAt} = args

  const imageUrls = []

  for (let i = 0; i < circleImageBase64.length; i++) {
    const imageUrlKey = `${patientId}${Date.now()}`
    const imageUrl = await uploadBase64Img(imageUrlKey, circleImageBase64[i])
    imageUrls.push(imageUrl)
  }

  await db.collection('foods').insertOne({
    patientId,
    circleContet: circleContent,
    circleImages: imageUrls,
    measurementTime,
    measuredAt,
    createdAt: new Date(),
  })

  return true

}
