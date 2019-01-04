const isEmpty = require('lodash/isEmpty')

export const shouldCheckProps = [
  'morning',
  'midday',
  'evening',
  'beforeSleep',
  'noLimit',
]

export const unitTextMap = {
  pairing: {
    unit: '对',
    meal: '餐前后',
    text: '的血糖配对测量',
  },
  count: {
    unit: '次',
    meal: '餐前',
    text: '进行测量',
  },
}

export const periodTextMap = {
  morning: '早',
  midday: '中',
  evening: '晚',
  beforeSleep: '睡前',
}

export const dinnerMap = {
  BEFORE_BREAKFAST: 'morning_b',
  AFTER_BREAKFAST: 'morning_a',
  BEFORE_LUNCH: 'midday_b',
  AFTER_LUNCH: 'midday_a',
  BEFORE_DINNER: 'evening_b',
  AFTER_DINNER: 'evening_a',
  BEFORE_SLEEPING: 'beforeSleep',
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

export const generateCustomText = measurePlan => {
  let text = ''
  if (!isEmpty(measurePlan.noLimit) && measurePlan.noLimit.quantity) {
    const { quantity, unit } = measurePlan.noLimit
    const tempObj = unitTextMap[unit] || {}
    text = `可以任意选择${quantity}${tempObj.unit}${tempObj.meal}${
      tempObj.text
    }`
  } else {
    let mealPeriod = ''
    let sleepText = ''
    ;['morning', 'midday', 'evening'].forEach(o => {
      const { quantity, unit } = measurePlan[o] || {}
      if (!isEmpty(measurePlan[o]) && quantity) {
        text = '可以选择'
        const tempObj = unitTextMap[unit] || {}
        mealPeriod += `${quantity}${tempObj.unit}${periodTextMap[o]}${
          tempObj.meal
        } `
      }
    })
    if (!isEmpty(measurePlan.beforeSleep) && measurePlan.beforeSleep.quantity) {
      text = '可以选择'
      const { quantity, unit } = measurePlan.beforeSleep
      const tempObj = unitTextMap[unit] || {}
      sleepText = `${quantity}${tempObj.unit}睡前血糖`
    }
    if (sleepText || mealPeriod) {
      text += `${mealPeriod}${sleepText}进行测量`
    }
  }
  return text
}

export const MONDAY_TEXT_ID = 'SMS_129746087'
export const WEDNESDAY_TEXT_ID = 'SMS_129756066'
export const SUNDAY_TEXT_NO_MEASURE_ID = 'SMS_129741134'
export const SUNDAY_TEXT_NO_COMPLETED_ID = 'SMS_129746684'
export const SUNDAY_TEXT_COMPLETED_ID = 'SMS_129741133'

export const healthCareTeamMap = {
  healthCareTeam1: {
    1: 'morning',
    2: 'afternoon',
    5: 'morning',
  },
  healthCareTeam2: {
    1: 'morning',
    3: 'morning',
  },
  healthCareTeam3: {
    3: 'afternoon',
  },
  healthCareTeam5: {
    2: 'afternoon',
  },
  healthCareTeam6: {
    // 东方诊从周五改到周四下午，所以统一小程序的nps都下午发送
    4: 'afternoon',
    // 5: 'afternoon',
  },
  healthCareTeam7: {
    1: 'morning',
    5: 'morning',
  },
  healthCareTeam9: {
    1: 'morning',
  },
}
