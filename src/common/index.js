import 'pinyin4js'
import { send } from 'righteous-raven'

export * from './formatBgValue'

const {
  RIGHTEOUS_RAVEN_URL,
  RIGHTEOUS_RAVEN_ID,
  RIGHTEOUS_RAVEN_KEY,
} = process.env

export const sendTxt = async options => {
  const { mobile, templateId, params } = options
  try {
    await send(RIGHTEOUS_RAVEN_URL, {
      client_id: RIGHTEOUS_RAVEN_ID,
      client_key: RIGHTEOUS_RAVEN_KEY,
      rec: mobile,
      prefix: '共同照护门诊',
      template: templateId,
      params,
    })
  } catch (e) {
    console.log(e, 'send txt error')
  }
}

export * from './logger'
