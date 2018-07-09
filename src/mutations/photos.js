import { IContext } from '../types'
import { uploadBase64Img } from '../utils'


export const savePhoto = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  const { patientId, data, owner, note } = args

  const photoUrlKey = `${patientId}${Date.now()}`
  const url = await uploadBase64Img(photoUrlKey, data)

  const photo = {
    patientId,
    url,
    owner,
    note,
    createdAt: new Date(),
  }

  const { result } = await db.collection('photos').insert(photo)
  return !!result.ok
}
