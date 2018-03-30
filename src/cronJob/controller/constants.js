
export const shouldCheckProps = ['morning', 'midday', 'evening', 'beforeSleep', 'noLimit']

export const unitTextMap = {
  pairing: '对',
  count: '次',
}

export const periodTextMap = {
  morning: '早',
  midday: '中',
  evening: '晚',
  beforeSleep: '睡前',
}

export const dinnerMap = {
  早餐前: 'morning_b',
  早餐后: 'morning_a',
  中餐前: 'midday_b',
  中餐后: 'midday_a',
  晚餐前: 'evening_b',
  晚餐后: 'evening_a',
  睡前: 'beforeSleep',
}

export const sameMap = {
  午餐前: '中餐前',
  午餐后: '中餐后',
  晚饭前: '晚餐前',
  晚饭后: '晚餐后',
}

export const typeTextMap = {
  A: '可以选早、中、晚各1对餐前后的血糖配对测量',
  B: '可以任意选择2对餐前餐后的血糖配对测量',
  C: '可以选早、中、晚各2对餐前后的血糖配对测量',
  D: '可以选早、中、晚各1对餐前后的血糖配对测量和一次睡前血糖的测量',
  E: '需要检测早餐前、晚餐前各7次血糖',
  F: '需要检测早餐前、午餐前、晚餐前各3次血糖',
}

export const MONDAY_TEXT_ID = 'SMS_129746087'
export const WEDNESDAY_TEXT_ID = 'SMS_129756066'
export const SUNDAY_TEXT_NO_MEASURE_ID = 'SMS_129741134'
export const SUNDAY_TEXT_NO_COMPLETED_ID = 'SMS_129746684'
export const SUNDAY_TEXT_COMPLETED_ID = 'SMS_129741133'
