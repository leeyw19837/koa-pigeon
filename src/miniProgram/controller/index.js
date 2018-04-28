
export * from './wx'

import { getDecodeUserInfo } from './wx'
import { getPatientByUnionId } from './user'
export * from './dataServices'

export const getUserInfoByUnionId = getPatientByUnionId

export const getUserInfo = async (code) => {
  const wxInfo = await getDecodeUserInfo(code)
  if (wxInfo.errcode) {
    return wxInfo
  }
  const userInfo = await getPatientByUnionId(wxInfo.unionid)
  return userInfo
}
