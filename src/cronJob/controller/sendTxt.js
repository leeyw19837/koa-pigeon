
import { send } from 'righteous-raven'

const {
  RIGHTEOUS_RAVEN_URL, RIGHTEOUS_RAVEN_ID, RIGHTEOUS_RAVEN_KEY
} = process.env

export const sendMeasurePlan = async (options) => {
  const { mobile, templateId, params } = options
  await send(RIGHTEOUS_RAVEN_URL, {
    client_id: RIGHTEOUS_RAVEN_ID,
    client_key: RIGHTEOUS_RAVEN_KEY,
    rec: mobile,
    prefix: '共同照护门诊',
    template: templateId,
    params,
  })
}
