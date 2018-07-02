import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import { formatBgValue } from '../common'
var moment = require('moment');

const periodTextMap = {
    'AFTER_BREAKFAST': 'BEFORE_BREAKFAST',
    'AFTER_LUNCH': 'BEFORE_LUNCH',
    'AFTER_DINNER': 'BEFORE_DINNER',
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
    if(latestCaseRecord.length) {
        const isUseInsulin = latestCaseRecord[0].caseContent.prescription.medicines.filter(o =>
            o.medicineType === 'insulin' && o.status !== 'stop' && o.function === 'BASAL')
        const isUseOral = latestCaseRecord[0].caseContent.prescription.medicines.filter(o =>
            o.medicineType === 'oral' && o.status !== 'stop')
        medicineType = isUseInsulin.length ? 'insulin' : (isUseOral.length?'oral':'')
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

const isAboveSeven = bgValue => bgValue > 7

const isFasting = (measurementTime) => measurementTime === 'BEFORE_BREAKFAST'

const isAfterMeal = measurementTime => /AFTER/g.test(measurementTime)

const isAboveTen = bgValue => bgValue > 10

// const isUseInsulin = async (patientId) => {
//     const medicineType = await getMedicineType(patientId)
//     return medicineType === 'insulin'
// }

const updateBgRecords = async (patientId,measurementTime,measuredAt,diagnoseType) => {
  // console.log('updateBgRecords',patientId,measurementTime,measuredAt,diagnoseType)

  // 由于needle没有传血糖记录的id，因此这里暂时使用测量时间来筛选血糖值(+-3秒内)
  let start = moment(measuredAt).subtract(3,'seconds').toDate()
  let end = moment(measuredAt).add(3,'seconds').toDate()
  // console.log('start:',start,'end:',end)

  try {
    await db.collection('bloodGlucoses').update(
      {
        patientId:patientId,
        measurementTime:measurementTime,
        measuredAt:{
            $gte: start,
            $lte: end
        },
      },
      {
        $set: {
          diagnoseType:diagnoseType,
        },
      }
    )
  } catch (error) {
    console.log(error)
  }
}

export const getDiagnoseType = async (_, args, { getDb }) => {
    let replyType = 'g'
    let bgValueBeforeMeal = 0

    let manualInputType = args.manualInputType

    let measuredAt = args.measuredAt
    let measurementTime = args.measurementTime
    let patientId = args.patientId
    let bloodGlucoseValue = args.bloodGlucoseValue

    console.log(args)

    if (manualInputType !== 'OTHERS' && manualInputType !== 'MANUAL_NOT_USE_BG_1' && manualInputType !== 'MANUAL_USE_BG_2') {
        return {
            diagnoseType: 'manual',
            bloodGlucoseValueBeforeMeal: `${bgValueBeforeMeal}`
        }
    }
    //const bgValue = formatBgValue(bloodGlucoseValue)
    const bgValue = bloodGlucoseValue
    if (bgValue) {
        if(isLessFour(bgValue)) {
            replyType = 'a'
            //console.log('isLessFour diagnoseType',replyType)
        } else{
            if(isAboveSeven(bgValue)) {
                //console.log('isAboveSeven diagnoseType',replyType)
                if (isFasting(measurementTime)){
                    //console.log('isFasting diagnoseType',replyType)
                    let result = await getMedicineType(patientId)
                    //console.log('result========',result)
                        if (result === 'insulin'){
                            replyType = 'c'
                            //console.log('result === insulin diagnoseType',replyType)
                        }else {
                            if (result === 'oral'){
                                replyType = 'b'
                                //console.log('result === oral diagnoseType',replyType)
                            }else {
                                replyType = 'g'
                                //console.log('else1 diagnoseType',replyType)
                            }
                        }

                }else {
                    if (isAfterMeal(measurementTime)){
                        //console.log('isAfterMeal(measurementTime) diagnoseType',replyType)
                        if (isAboveTen(bgValue)){
                            //console.log('isAboveTen(bgValue) diagnoseType',replyType)
                            let result = await getPairingBgRecord({patientId, measurementTime, measuredAt})
                                if (result){
                                    //console.log('result getPairingBgRecord diagnoseType',replyType,'result',result)
                                    bgValueBeforeMeal = result
                                    if (bgValue - result > 3.5){
                                        replyType = 'd'
                                        //console.log('bgValue - result>3.5 diagnoseType',replyType)
                                    }else {
                                        replyType = 'e'
                                        //console.log('else2 diagnoseType',replyType)
                                    }
                                }else {
                                    replyType = 'f'
                                    //console.log('else3 diagnoseType',replyType)
                                }

                        }else {
                            replyType = 'g'
                            //console.log('else4 diagnoseType',replyType)
                        }
                    }else {
                        replyType = 'g'
                        //console.log('else5 diagnoseType',replyType)
                    }
                }
            }else {
                replyType = 'g'
                //console.log('else6 diagnoseType',replyType)
            }
        }
    } else {
        //console.log('else7 diagnoseType',replyType)
        console.log('BG value should be a number or could convert to number !!!')
    }

    console.log('diagnoseType',replyType,'bloodGlucoseValueBeforeMeal',`${bgValueBeforeMeal}`)

    // 2018-06-25 对血糖记录表增加一个sourceType字段
    updateBgRecords(patientId,measurementTime,measuredAt,replyType)

    return {
        diagnoseType: replyType,
        bloodGlucoseValueBeforeMeal: `${bgValueBeforeMeal}`
    }
}
