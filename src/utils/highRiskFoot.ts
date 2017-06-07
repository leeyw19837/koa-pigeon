import { get } from 'lodash'

const getPeripheralVessel = (peripheralVessel: any = {}) => {
  const {
    symptoms,
    dorsalisPedisRight,
    dorsalisPedisLeft,
    ABIRight,
    ABILeft,
    TBIRight,
    TBILeft,
  } = peripheralVessel
  const isRestPain = get(symptoms, 'had') && get(symptoms, 'restPain')
  const getABITBI = () => {
    const scenario1 = (ABIRight && ABIRight < 0.9) || (ABILeft && ABILeft < 0.9)
    let scenario2 = false
    if ((ABIRight && TBIRight && (ABIRight > 1.3 && TBIRight < 0.6))
    || (ABILeft && TBILeft && (ABILeft > 1.3 && TBILeft < 0.6))) {
      scenario2 = true
    }
    return scenario1 || scenario2
  }
  const isDorsalisPedis = [dorsalisPedisRight, dorsalisPedisLeft].indexOf('missing') !== -1
  const isABIOrTBI = getABITBI()
  return isRestPain || isDorsalisPedis || isABIOrTBI
}

const getPeripheralNerve = (peripheralNerve: any = {}) => {
  const {
    symptom, pressureSense, vibrationSense,
    acupunctureSence, thalposis, ankleJerk,
  } = peripheralNerve
  const isBad = item => item === false
  const isExistedSymptom = isBad(get(symptom, 'normal'))
  const combBad = property => isBad(get(property, 'left')) || isBad(get(property, 'right'))
  const isPressureSense = combBad(pressureSense)
  const isVibrationSense = combBad(vibrationSense)
  const isThalposis = combBad(thalposis)
  const isAnkleJerk = combBad(ankleJerk)
  const array = ['leftTop', 'rightTop', 'leftBottom', 'rightBottom']
  const acupunctureSenceFilter = array.filter(item => isBad(get(acupunctureSence, `${item}.${item}-normal`)))
  const badFilter = [isPressureSense, isVibrationSense,
    isThalposis, isAnkleJerk, acupunctureSenceFilter.length].filter(o => o)
  return (isExistedSymptom && !!badFilter.length) || (!isExistedSymptom && badFilter.length > 1)
}

const getBoneAndJoint = (boneAndJoint = {}, skinConditions) => {
  const twoSide = ['Left', 'Right']
  const footBad = ['edema', 'bladder', 'cracks', 'callus', 'discoloration']
  const skinCallus = get(skinConditions, 'had') && get(skinConditions, 'callus')
  return skinCallus || !!twoSide.filter(item => get(boneAndJoint, `deformity${item}.had`)
    && footBad.filter(o => get(boneAndJoint, `deformity${item}${o}`)).length).length
}

export default data => {
  const { medicalHistory, peripheralVessel,
    peripheralNerve, boneAndJoint, skinConditions } = data
  const isFootUlcer = get(medicalHistory, 'had') && get(medicalHistory, 'footUlcer')
  const isAmputated = get(medicalHistory, 'had') && get(medicalHistory, 'amputation')
  const isBadForPeripheralVessel = getPeripheralVessel(peripheralVessel)
  const isBadForPeripheralNerve = getPeripheralNerve(peripheralNerve)
  const isFootDeformity = getBoneAndJoint(boneAndJoint, skinConditions)

  const level0 = !isFootUlcer && !isAmputated && !isBadForPeripheralVessel &&
    !isBadForPeripheralNerve && !isFootDeformity
  const level1 = !isFootUlcer && !isAmputated && !isBadForPeripheralVessel &&
    isBadForPeripheralNerve && !isFootDeformity
  const level2 = isFootDeformity || (isBadForPeripheralVessel && isBadForPeripheralNerve)
  const level3 = isFootUlcer || isAmputated
  let highRiskFoot = ''
  if (level0) {
    highRiskFoot = 'level0'
  } else if (level1) {
    highRiskFoot = 'level1'
  } else if (level2) {
    highRiskFoot = 'level2'
  } else if (level3) {
    highRiskFoot = 'level3'
  }
  return highRiskFoot
}
