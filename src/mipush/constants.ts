const VERSION = 3

export const MI_PUSH_URL = 'https://api.xmpush.xiaomi.com'

export const PACKAGE_NAME = {
  ios: 'com.ihealthlabs.HuTang',
  android: 'com.ihealth.HuTang',
}

export const APP_SECRET = {
  ios: 'Go8a5qc6451hUQaHR2q0xw==',
  android: 'bKFhTEF4RF0EJ03NqqX3kg==',
}

export const ALIAS_URL = `${MI_PUSH_URL}/v${VERSION}/message/alias`

export const TYPE_MAP = {
  MEASURE_PLAN: 1, // 测量
  CHAT: 2,
  EXAMINE: 3, // 就诊
  DRUGS: 4, // 用药
}
