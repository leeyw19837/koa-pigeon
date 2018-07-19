import { ObjectID } from 'mongodb'

import { formatBgValue } from '../common'

var moment = require('moment');

const periodTextMap = {
  'AFTER_BREAKFAST': 'BEFORE_BREAKFAST',
  'AFTER_LUNCH': 'BEFORE_LUNCH',
  'AFTER_DINNER': 'BEFORE_DINNER',
}

const medicineFrequencyMap = {
  'AFTER_BREAKFAST': 'uBBF',
  'AFTER_LUNCH': 'uBL',
  'AFTER_DINNER': 'uBD',
}

const getMedicineType = async (patientId) => {
  let medicineType = ''
  const latestCaseRecord = await db
    .collection('caseRecord')
    .find({
      patientId,
    })
    .sort({caseRecordAt: -1})
    .limit(1)
    .toArray()
  if (latestCaseRecord.length) {
    const isUseInsulin = latestCaseRecord[0].caseContent.prescription.medicines.filter(o =>
      o.medicineType === 'insulin' && o.status !== 'stop' && o.function === 'BASAL')
    const isUseOral = latestCaseRecord[0].caseContent.prescription.medicines.filter(o =>
      o.medicineType === 'oral' && o.status !== 'stop')
    medicineType = isUseInsulin.length ? 'insulin' : (isUseOral.length ? 'oral' : '')
  }
  return medicineType
}

const getMedicineFrequency = async (patientId,measurementTime) => {
  let medicineType = false
  const latestCaseRecord = await db
    .collection('caseRecord')
    .find({
      patientId,
    })
    .sort({caseRecordAt: -1})
    .limit(1)
    .toArray()
  if (latestCaseRecord.length) {
    const isUseInsulin = latestCaseRecord[0].caseContent.prescription.medicines.filter(o =>
      o.medicineType === 'insulin' && o.function==='BOLUS')
    medicineType = isUseInsulin.length ? true : false
  }
  return medicineType
}

const getPairingBgRecord = async ({patientId, measurementTime, measuredAt}) => {
  const bgRecords = await db
    .collection('bloodGlucoses')
    .find({
      patientId,
      measurementTime: periodTextMap[measurementTime],
      measuredAt: {
        $gt: moment(measuredAt).startOf('day')._d,
        $lt: moment(measuredAt).endOf('day')._d,
      },
      dataStatus: 'ACTIVE'
    })
    .sort({
      measuredAt: -1,
    })
    .limit(1)
    .toArray()
  return bgRecords.length ? formatBgValue(bgRecords[0].bloodGlucoseValue) : null
}

const isLessFour = bgValue => bgValue <= 3.9

const isAboveSeven = bgValue => bgValue >= 7

const isFasting = (measurementTime) => measurementTime === 'BEFORE_BREAKFAST'

const isBeforeLunchOrSupper = (measurementTime) => measurementTime === 'BEFORE_LUNCH' || measurementTime === 'BEFORE_DINNER'

const isAfterMeal = measurementTime => /AFTER/g.test(measurementTime)

const isAboveTen = bgValue => bgValue > 10

const isBeforeMeal = measurementTime => /BEFORE/g.test(measurementTime)

export const getDiagnoseTypeNew = async (_, args, {getDb}) => {
  let replyType = 'g'
  let bgValueBeforeMeal = 0

  let manualInputType = args.manualInputType

  let measuredAt = args.measuredAt
  let measurementTime = args.measurementTime
  let patientId = args.patientId
  let bloodGlucoseValue = args.bloodGlucoseValue

  console.log(args)

  if (manualInputType !== 'OTHERS'
    && manualInputType !== 'MANUAL_NOT_USE_BG_1'
    && manualInputType !== 'MANUAL_USE_BG_2'
    && manualInputType !== 'NUBG_1'
    && manualInputType !== 'NUBG_2') {
    return {
      diagnoseType: 'manual',
      bloodGlucoseValueBeforeMeal: `${bgValueBeforeMeal}`
    }
  }

  //const bgValue = formatBgValue(bloodGlucoseValue)
  const bgValue = bloodGlucoseValue
  if (bgValue) {
    if (isLessFour(bgValue)) {
      replyType = 'a'
      // console.log('isLessFour diagnoseType',replyType)
    } else {
      if (isAboveSeven(bgValue)) {
        // console.log('isAboveSeven diagnoseType',replyType)
        if (isFasting(measurementTime)) {
          // console.log('isFasting diagnoseType',replyType)
          let result = await getMedicineType(patientId)
          // console.log('result========',result)
          if (result === 'insulin') {
            replyType = 'c'
            // console.log('result === insulin diagnoseType',replyType)
          } else {
            if (result === 'oral') {
              replyType = 'b'
              // console.log('result === oral diagnoseType',replyType)
            } else {
              replyType = 'i'
              // console.log('else1 diagnoseType',replyType)
            }
          }
        } else if (isBeforeLunchOrSupper(measurementTime)) {
          replyType = 'h'
        } else if (isAfterMeal(measurementTime)) {
          // console.log('isAfterMeal(measurementTime) diagnoseType',replyType)
          if (isAboveTen(bgValue)) {
            // console.log('isAboveTen(bgValue) diagnoseType',replyType)
            let result = await getPairingBgRecord({patientId, measurementTime, measuredAt})
            if (result) {
              // console.log('result getPairingBgRecord diagnoseType',replyType,'result',result)
              bgValueBeforeMeal = result
              if (bgValue - result >= 3.5) {
                replyType = 'd'
                // console.log('bgValue - result>3.5 diagnoseType',replyType)
              } else {
                if (bgValueBeforeMeal>6.6 && bgValueBeforeMeal<=7) {
                  replyType = 'e'
                }else {
                  let result = await getMedicineFrequency(patientId,measurementTime)
                  if (result){
                    replyType = 'k'
                  }else {
                    replyType = 'j'
                  }
                }
                // console.log('else2 diagnoseType',replyType)
              }
            } else {
              replyType = 'f'
              // console.log('else3 diagnoseType',replyType)
            }
          } else {
            replyType = 'g'
            // console.log('else5 diagnoseType',replyType)
          }
        } else {
          replyType = 'g'
        }
      } else {
        if (isBeforeMeal(measurementTime)) {
          replyType = 'l'
        } else {
          replyType = 'g'
        }
        // console.log('else6 diagnoseType',replyType)
      }
    }
  } else {
    // console.log('else7 diagnoseType',replyType)
    console.log('BG value should be a number or could convert to number !!!')
  }

  console.log('diagnoseType', replyType, 'bloodGlucoseValueBeforeMeal', `${bgValueBeforeMeal}`)

  return {
    diagnoseType: replyType,
    bloodGlucoseValueBeforeMeal: `${bgValueBeforeMeal}`
  }
}
