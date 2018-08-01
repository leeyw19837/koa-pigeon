import { uploadBase64Img, uploadFile } from '../../utils/ks3'

export const uploadFileByType = async ctx => {
  const { apkType, base64Data } = ctx.request.body
  let url = ''
  if (!apkType) {
    const key = `workwechat${new Date().getTime()}`
    url = await uploadBase64Img(key, base64Data)
  } else {
    const key = `${apkType}.apk`
    url = await uploadFile(key, base64Data)
  }
  return url
}
