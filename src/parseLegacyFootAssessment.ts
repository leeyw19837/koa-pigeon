const get = require('lodash.get')

export const parseLegacyFootAssessment = (a: any) => {
  return {
    _id: a._id,
    patient: { _id: a.patientId },
    footwearQuestions: a.footgear,
    footwearSelection: {
      flipFlops: defaultToFalse(a, 'footgear.question16.flipflops'),
      crocs: defaultToFalse(a, 'footgear.question16.hole'),
      net: defaultToFalse(a, 'footgear.question16.netsurface'),
      flats: defaultToFalse(a, 'footgear.question16.flat'),
      mocassins: defaultToFalse(a, 'footgear.question16.peas'),
      dress: defaultToFalse(a, 'footgear.question16.leather'),
      lowHeel: defaultToFalse(a, 'footgear.question16.three'),
      midHeel: defaultToFalse(a, 'footgear.question16.threetofive'),
      highHeel: defaultToFalse(a, 'footgear.question16.fivetoeight'),
      rain: defaultToFalse(a, 'footgear.question16.rain'),
      sandals: defaultToFalse(a, 'footgear.question16.sandals'),
      football: defaultToFalse(a, 'footgear.question16.football'),
      running: defaultToFalse(a, 'footgear.question16.running'),
      hiking: defaultToFalse(a, 'footgear.question16.hiking'),
    },
    medicalHistory: {
      selected: defaultEnumToNull(a, 'medicalHistory.had', 'PRESENT', 'NOT_PRESENT'),
      history: historyParser(a, 'medicalHistory'),
    },
    skin: {
      abnormalityPresent: defaultEnumToNull(a, 'skinConditions.had', 'ABNORMAL', 'NORMAL'),
      abnormalities: skinParser(a, 'skinConditions'),
      footTemperatures: temperatureParser(a, 'skinConditions'),
    },
    bone: {
      deformitiesLeftPresent: defaultEnumToNull(a, 'boneAndJoint.deformityLeft.had', 'DEFORMED', 'NOT_DEFORMED'),
      deformitiesRightPresent: defaultEnumToNull(a, 'boneAndJoint.deformityRight.had', 'DEFORMED', 'NOT_DEFORMED'),
      deformitiesLeft: deformityParser(a, 'boneAndJoint.deformityLeft'),
      deformitiesRight: deformityParser(a, 'boneAndJoint.deformityRight'),
      ankleJointLimitationLeftPresent: defaultEnumToNull(a, 'boneAndJoint.jointLeft.had', 'ABNORMAL', 'NORMAL'),
      ankleJointLimitationRightPresent: defaultEnumToNull(a, 'boneAndJoint.jointRight.had', 'ABNORMAL', 'NORMAL'),
      ankleJointLimitationLeft: limitationParser(a, 'boneAndJoint.jointLeft'),
      ankleJointLimitationRight: limitationParser(a, 'boneAndJoint.jointRight'),
      ballJointLimitationLeftPresent:
        defaultEnumToNull(a, 'boneAndJoint.firstPlantarToeJointLeft.had', 'ABNORMAL', 'NORMAL'),
      ballJointLimitationRightPresent:
        defaultEnumToNull(a, 'boneAndJoint.firstPlantarToeJointRight.had', 'ABNORMAL', 'NORMAL'),
      ballJointLimitationLeft: limitationParser(a, 'boneAndJoint.firstPlantarToeJointLeft'),
      ballJointLimitationRight: limitationParser(a, 'boneAndJoint.firstPlantarToeJointRight'),
    },
    blood: {
      symptomsPresent: defaultEnumToNull(a, 'peripheralVessel.symptoms.had', 'SYMPTOMS', 'NO_SYMPTOMS'),
      symptoms: bloodSymptomParser(a, 'peripheralVessel.symptoms'),
      instepPulseLeft: pulseParser(a, 'peripheralVessel.dorsalisPedisLeft'),
      instepPulseRight: pulseParser(a, 'peripheralVessel.dorsalisPedisRight'),
      conclusion: a.peripheralVessel.conclusion && a.peripheralVessel.conclusion.toUpperCase(),
      ABILeft: +a.peripheralVessel.ABILeft,
      ABIRight: +a.peripheralVessel.ABIRight,
      TBILeft: +a.peripheralVessel.TBILeft,
      TBIRight: +a.peripheralVessel.TBIRight,
    },
    nerve: {
      // NOTE: the following bool values have opposite to above normal abnormal logic
      symptomsPresent: defaultEnumToNull(a, 'peripheralNerve.symptom.normal', 'NO_SYMPTOMS', 'SYMPTOMS'),
      symptoms: nerveSymptomParser(a, 'peripheralNerve.symptom.items'),
      // NOTE: the following bool values have opposite to above normal abnormal logic
      pressureSenseLeft: defaultEnumToNull(a, 'peripheralNerve.pressureSense.left', 'NORMAL', 'ABNORMAL'),
      pressureSenseRight: defaultEnumToNull(a, 'peripheralNerve.pressureSense.right', 'NORMAL', 'ABNORMAL'),
      vibrationSenseLeft: defaultEnumToNull(a, 'peripheralNerve.vibrationSense.right', 'NORMAL', 'ABNORMAL'),
      vibrationSenseRight: defaultEnumToNull(a, 'peripheralNerve.vibrationSense.right', 'NORMAL', 'ABNORMAL'),
      temperatureSenseLeft: defaultEnumToNull(a, 'peripheralNerve.thalposis.right', 'NORMAL', 'ABNORMAL'),
      temperatureSenseRight: defaultEnumToNull(a, 'peripheralNerve.thalposis.right', 'NORMAL', 'ABNORMAL'),
      ankleReflexLeft: defaultEnumToNull(a, 'peripheralNerve.ankleJerk.right', 'NORMAL', 'ABNORMAL'),
      ankleReflexRight: defaultEnumToNull(a, 'peripheralNerve.ankleJerk.right', 'NORMAL', 'ABNORMAL'),
      leftArmSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.leftTop'),
      rightArmSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.rightTop'),
      leftLegSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.leftBottom'),
      rightLegSensitivity: acupuntureSenceParser(a, 'peripheralNerve.acupunctureSence.rightBottom'),
      hasDoneSomatesthesiaCheck: defaultToNull(a, 'peripheralNerve.somatesthesiaCheck.checkBefore'),
      needsSomatesthesiaCheck: defaultToNull(a, 'peripheralNerve.somatesthesiaCheck.needCheck'),
    },
  }
}
const defaultEnumToNull = (object: object, path: string, trueState: string, falseState: string) => {
  const value = get(object, path)
  if (value === true)return trueState
  if (value === false)return falseState
  return null

}
// TODO: test this
const acupuntureSenceParser = (object: object, path: string) => {
  const value = get(object, `${path}.items`, [])
  const limbComponent = path.split('.')[2]
  const isNormal = get(object, `${path}.${limbComponent}-normal`, false)
  if (value.includes('感觉消退')) return 'NUMBNESS'
  if (value.includes('疼痛过敏')) return 'PAIN'
  if (isNormal)return 'NORMAL'
  return null
}
const pulseParser = (object: object, path: string) => {
  const value = get(object, path)
  if (value === 'less') return 'WEAK'
  if (value === 'missing') return 'NO_PULSE'
  if (value === 'normal') return 'NORMAL'
  return null
}
const deformityParser = (object: object, path: string) => {
  return {
    bunion: get(object, path + '.discoloration', false),
    charcotFoot: get(object, path + '.edema', false),
    hammertoe: get(object, path + '.bladder', false),
    clawToe: get(object, path + '.cracks', false),
    malletToe: get(object, path + '.callus', false),
  }
}
const historyParser = (object: object, path: string) => {
  return {
    hadFootUlcer: get(object, path + '.footUlcer', false),
    amputee: get(object, path + '.amputation', false),
    recievedFootcareInstruction: get(object, path + '.education', false),
    livesAlone: get(object, path + '.liveAlone', false),
  }
}
const skinParser = (object: object, path: string) => {
  return {
    discoloration: get(object, path + '.discoloration', false),
    edema: get(object, path + '.edema', false),
    flakySkin: get(object, path + '.desquamation', false),
    blister: get(object, path + '.bladder', false),
    cracks: get(object, path + '.cracks', false),
    callus: get(object, path + '.callus', false),
    ingrownToenail: get(object, path + '.qianjian', false),
    athletesFoot: get(object, path + '.zuxuan', false),
    toenailFungus: get(object, path + '.jiajian', false),
  }
}
const temperatureParser = (object: object, path: string) => {
  const unit = 'C'
  return {
    environment: { value: get(object, path + '.temperatureOfEnvironment', false), unit },
    rightMetatarsal: { value: get(object, path + '.temperatureOfRightMetatarsal', false), unit },
    leftMetatarsal: { value: get(object, path + '.temperatureOfLeftMetatarsal', false), unit },
    right: { value: get(object, path + '.temperatureOfRight', false), unit },
    left: { value: get(object, path + '.temperatureOfLeft', false), unit },
  }
}
const limitationParser = (object: object, path: string) => {
  return {
    backStretch: get(object, path + '.BackStretchLimited', false),
    plantarFlexion: get(object, path + '.PlantarFlexionLimited', false),
  }
}
const bloodSymptomParser = (object: object, path: string) => {
  return {
    restPain: get(object, path + '.restPain', false),
    intermittentClaudication: get(object, path + '.intermittentClaudication', false),
  }
}
const nerveSymptomParser = (object: object, path: string) => {
  const value = get(object, path, [])
  return {
    pain: value.includes('疼痛'),
    numbness: value.includes('麻木'),
    paresthesia: value.includes('感觉异常'),
  }
}
const defaultToNull = (object: object, path: string) => {
  return get(object, path, null)
}
const defaultToFalse = (object: object, path: string) => {
  return get(object, path, false)
}
