export const mealsPeriodTextMap = {
  AFTER_BREAKFAST: 'BEFORE_BREAKFAST',
  AFTER_LUNCH: 'BEFORE_LUNCH',
  AFTER_DINNER: 'BEFORE_DINNER',
  BEFORE_BREAKFAST: 'AFTER_BREAKFAST',
  BEFORE_LUNCH: 'AFTER_LUNCH',
  BEFORE_DINNER: 'AFTER_DINNER',
}

export const isLessFour = value => value < 4 * 18

export const isAboveSeven = bloodGlucoseValue => bloodGlucoseValue >= 7 * 18

export const isAfterMeal = value => /AFTER/g.test(value)

export const isBigFluctuation = (meala, mealb) => {
  if (meala.measurementTime === mealb.measurementTime) return false
  const beforeMeal = isAfterMeal(meala.measurementTime) ? mealb : meala
  const afterMeal = isAfterMeal(meala.measurementTime) ? meala : mealb
  return afterMeal.bloodGlucoseValue - beforeMeal.bloodGlucoseValue >= 3.5 * 18
}

export const isMealRecord = measurementTime =>
  !!mealsPeriodTextMap[measurementTime]

export const isAboveTen = value => value > 10 * 18
