import get from 'lodash/get'
import { sign } from 'jsonwebtoken'
const request = require('request-promise')

const {
  ELASTIC_ELEPHANT_URL = 'http://172.16.0.69:6010',
  NODE_ENV,
  JWT_SECRET,
  TEST_LOGGER,
} = process.env

const sendToElasticSearch = ({ context, ...restInfo }) => {
  let authorization = get(context, 'request.headers.authorization', '')
  if (!authorization) {
    authorization = `Bearer ${sign({ from: 'pigeon' }, JWT_SECRET, {
      expiresIn: '1m',
    })}`
  }
  const isProd = NODE_ENV === 'production'
  if (isProd || TEST_LOGGER) {
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
