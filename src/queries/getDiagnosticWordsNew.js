const moment = require('moment')

const periodTextMap = {
  'BEFORE_BREAKFAST': '早',
  'BEFORE_LUNCH': '午',
  'BEFORE_DINNER': '晚',
}

// const updateBgRecords = async (bgRecordId, _diagnoseSourceType) => {
//   console.log('updateBgRecords',bgRecordId, _diagnoseSourceType)
//
//   try {
//     await db.collection('bloodGlucoses').update(
//       {
//         _id: bgRecordId,
//       },
//       {
//         $set: {
//           diagnoseType: _diagnoseSourceType,
//         },
//       }
//     )
//   } catch (error) {
//     console.log(error)
//   }
// }

const updateBgRecords = async (patientId,measurementTime,measuredAt,diagnoseType) => {
   console.log('updateBgRecords',patientId,measurementTime,measuredAt,diagnoseType)

  // 由于needle没有传血糖记录的id，因此这里暂时使用测量时间来筛选血糖值(+-3秒内)
  let start = moment(measuredAt).subtract(3,'seconds').toDate()
  let end = moment(measuredAt).add(3,'seconds').toDate()
   console.log('start:',start,'end:',end)

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

export const getDiagnosticWordsNew = async (_, args, {getDb}) => {
  // console.log('args::::',args)
  const diagnoseType = args.diagnoseType
  const bloodGlucoseValue = args.bloodGlucoseValue
  const bgValueBeforeMeal = args.bgValueBeforeMeal
  const manualInputType = args.manualInputType

  // const bgRecordId = args.bgRecordId
  const patientId = args.patientId
  const measuredAt = args.measuredAt
  const measurementTime = args.measurementTime

  const diagnosticWordsResult = await db
    .collection('diagnosticWordsNew')
    .find({diagnoseType: diagnoseType})
    .toArray()

  let randomResult
  let _diagnoseWords = ''
  let _diagnoseSourceType = ''
  switch (diagnoseType) {
    case 'a':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'b':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'c':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'd':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue).replace(/Y/g, bgValueBeforeMeal)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'e':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'f':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'h':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/Z/g, periodTextMap[measurementTime]).replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'i':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'j':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue).replace(/Y/g, bgValueBeforeMeal)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'k':
      randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
      _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/g, bloodGlucoseValue).replace(/Y/g, bgValueBeforeMeal)}`
      _diagnoseSourceType = randomResult.sourceType
      break

    case 'manual':
      randomResult = diagnosticWordsResult.filter(o =>
        manualInputType === o.sourceType
      )
      if (randomResult && randomResult.length > 0) {
        _diagnoseWords = randomResult[0].diagnoseWords
        _diagnoseSourceType = randomResult[0].sourceType
      } else {
        _diagnoseWords = ''
        _diagnoseSourceType = ''
      }
      break

    default:
      _diagnoseWords = ''
      _diagnoseSourceType = ''
  }

  // 2018-07-09 修改需求：对血糖记录表增加sourceType字段
  updateBgRecords(patientId, measurementTime,measuredAt,_diagnoseSourceType)

  return {
    diagnoseWords: _diagnoseWords,
    sourceType: _diagnoseSourceType,
  }

}