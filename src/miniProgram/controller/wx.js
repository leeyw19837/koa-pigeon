import { WX_URL, MINI_PROGRAM_APPID, MINI_PROGRAM_SECRET } from '../constants'
const request = require('request-promise')

export const getDecodeUserInfo = async (code) => {
  const uri = `${WX_URL}/sns/jscode2session?appid=${MINI_PROGRAM_APPID}&secret=${MINI_PROGRAM_SECRET}&js_code=${code}&grant_type=authorization_code`
  const options = {
    method: 'GET',
    uri,
  }
  return JSON.parse(await request(options))
}
