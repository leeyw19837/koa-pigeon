import { uploadBase64Img } from '../utils/ks3'


export default {
  savePhoto: async (_, args, { db }) => {
    const { patientId, data, context, notes } = args

    const photoUrlKey = `${patientId}${Date.now()}`
    const url = await uploadBase64Img(photoUrlKey, data)

    const oldContext = (() => {
      switch (context) {
        case 'FOOT_ASSESSMENT': return 'footAssessment'
        default: throw new TypeError(`Unknown context ${context}`)
      }
    })()

    const photo = {
      patientId,
      url,
      owner: oldContext || '',
      note: notes || '',
      createdAt: new Date(),
    }

    const { result } = await db.collection('photos').insert(photo)
    return !!result.ok
  },
}
