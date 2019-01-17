import 'pinyin4js'
import get from 'lodash/get'
import { send } from 'righteous-raven'
const request = require('request-promise')

export * from './formatBgValue'

const {
  RIGHTEOUS_RAVEN_URL,
  RIGHTEOUS_RAVEN_ID,
  RIGHTEOUS_RAVEN_KEY,
  ELASTIC_ELEPHANT_URL = 'http://172.16.0.69:6010',
  NODE_ENV,
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

const sendToElasticSearch = ({ context, ...restInfo }) => {
  const authorization = get(context, 'request.headers.authorization', '')
  const isProd = NODE_ENV === 'production'
  if (isProd) {
    try {
      const uri = `${ELASTIC_ELEPHANT_URL}/addLog`
      const options = {
        method: 'POST',
        uri,
        json: true,
        headers: {
          Authorization: authorization,
          'Client-Label': 'pigeon',
        },
        body: restInfo,
      }
      request(options)
    } catch (error) {
      console.log('add Log error')
    }
  }
}

export const logger = {
  log: params => {
    try {
      sendToElasticSearch(params)
    } catch (error) {
      console.log('logger error')
    }
  },
}
