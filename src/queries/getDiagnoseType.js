import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import { formatBgValue } from '../common'

const periodTextMap = {
    'AFTER_BREAKFAST': 'BEFORE_BREAKFAST',
    'AFTER_LUNCH': 'BEFORE_LUNCH',
    'AFTER_DINNER': 'BEFORE_DINNER',
}

const getMedicineType = async (patientId) => {
    let medicineType = 'oral'
    const latestCaseRecord = await db
        .collection('caseRecord')
        .find({
            patientId,
        })
        .sort({caseRecordAt: -1})
        .limit(1)
        .toArray()
    if(latestCaseRecord.length) {
        const isUseInsulin = latestCaseRecord[0].caseContent.prescription.medicines.filter(o =>
            o.medicineType === 'insulin' && o.status !== 'stop')
        medicineType = isUseInsulin.length ? 'insulin' : 'oral'
    }
    return medicineType
}

const getPairingBgRecord = async ({ patientId, measurementTime, measuredAt}) => {
    const bgRecords = await db
        .collection('bloodGlucoses')
        .find({
            patientId,
            measurementTime: periodTextMap[measurementTime],
            measuredAt: {
                $gt: moment(measuredAt).startOf('day')._d,
                $lt: moment(measuredAt).endOf('day')._d,
            }
        })
        .sort({
            measuredAt: -1,
        })
        .limit(1)
        .toArray()
    return bgRecords.length ? formatBgValue(bgRecords[0]) : null
}

const isLessFour = value => value < 3.9

const isAboveSeven = bgRecord => bgRecord.bloodGlucoseValue > 7

const isFasting = (value) => measurementTime === 'BEFORE_BREAKFAST'

const isAfterMeal = value => /AFTER/g.test(value)

const isAboveTen = value => value > 10

const isUseInsulin = async (patientId) => {
    const medicineType = await getMedicineType(patientId)
    return medicineType === 'insulin'
}

export const getDiagnoseType = async (_, args, { getDb }) => {
    let replyType = 'g'
    let bgValueBeforeMeal = 0

    let measuredAt = args.measuredAt
    let measurementTime = args.measurementTime
    let patientId = args.patientId
    let bloodGlucoseValue = args.bloodGlucoseValue

    console.log(args)

    //const bgValue = formatBgValue(bloodGlucoseValue)
    const bgValue = bloodGlucoseValue
    if (bgValue) {
        if(isLessFour(bgValue)) {
            replyType = 'a'
        } else if(isAboveSeven(bgValue)) {
            // TODO
            if (isFasting(measurementTime)){
                getMedicineType(patientId).then((result)=>{
                    if (result === 'insulin'){
                        replyType = 'c'
                    }else {
                        if (result === 'oral'){
                            replyType = 'b'
                        }else {
                            replyType = 'g'
                        }
                    }
                })
            }else {
                if (isAfterMeal(measurementTime)){
                    if (isAboveTen(bgValue)){
                       getPairingBgRecord(patientId, measurementTime, measuredAt).then((result)=>{
                           if (result){
                               bgValueBeforeMeal = bgValue - result
                               if (bgValueBeforeMeal>3.5){
                                   replyType = 'd'
                               }else {
                                   replyType = 'e'
                               }
                           }else {
                               replyType = 'f'
                           }
                       })
                    }else {
                        replyType = 'g'
                    }
                }else {
                    replyType = 'g'
                }
            }
        }

    } else {
        console.log('BG value should be a number or could convert to number !!!')
    }

    console.log('diagnoseType',replyType,'bloodGlucoseValueBeforeMeal',`${bgValueBeforeMeal}`)
    return {
        diagnoseType: 'b',
        bloodGlucoseValueBeforeMeal: `${bgValueBeforeMeal}`
    }
}
