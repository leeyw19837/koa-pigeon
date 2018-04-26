
export * from './wx'

import { getDecodeUserInfo } from './wx'
import { getPatientByUnionId } from './user'

export const getUserInfo = async (code) => {
  const wxInfo = await getDecodeUserInfo(code)
  const userInfo = await getPatientByUnionId(wxInfo)
  return userInfo
}
