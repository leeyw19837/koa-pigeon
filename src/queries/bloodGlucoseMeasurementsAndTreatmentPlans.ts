import {ObjectId} from 'mongodb'
import {IContext} from '../types'

export const bloodGlucoseMeasurementsAndTreatmentPlans = async (_,
                                                                args,
                                                                {getDb}: IContext) => {
    const db = await getDb()
    const cursor = {patientId: args.patientId}
    if (args.from && args.to) {
        Object.assign(cursor, {
            measuredAt: {$gt: args.from, $lt: args.to},
            dataStatus: {$ne: 'DELETED'},
        })
    }

    // const bloodGlucoseMeasurementsResult = await db
    //   .collection('bloodglucoses')
    //   .find(cursor)
    //   .sort({ createdAt: -1 })
    //   .toArray()
    const bloodGlucoseMeasurementsResult = await db
        .collection('bloodGlucoses')
        .find(cursor)
        .sort({measuredAt: -1})
        .toArray()

    console.log('bloodGlucoseMeasurementsResult===', bloodGlucoseMeasurementsResult)

    const treatmentPlansResult = await db
        .collection('bg_measure_module')
        .find({patientId: args.patientId})
        .sort({createdAt: -1})
        .toArray()

    const treatmentPlans = treatmentPlansResult.map(item => ({
        startAt: item.startAt,
        endAt: item.endAt,
        testTimes: {
            monday: convertObjectToArray(item.Monday),
            tuesday: convertObjectToArray(item.Tuesday),
            wednesday: convertObjectToArray(item.Wednesday),
            thursday: convertObjectToArray(item.Thursday),
            friday: convertObjectToArray(item.Friday),
            saturday: convertObjectToArray(item.Saturday),
            sunday: convertObjectToArray(item.Sunday),
        },
    }))

    const DigestiveStateMap = {
        BEFORE_BREAKFAST: 'BEFORE_BREAKFAST',
        AFTER_BREAKFAST: 'AFTER_BREAKFAST',
        BEFORE_LUNCH: 'BEFORE_LUNCH',
        AFTER_LUNCH: 'AFTER_LUNCH',
        BEFORE_DINNER: 'BEFORE_DINNER',
        AFTER_DINNER: 'AFTER_DINNER',
        BEFORE_SLEEPING: 'BEFORE_SLEEP',
        MIDNIGHT: 'MIDNIGHT',
        RANDOM: 'UNKNOWN',
    }

    const bloodGlucoseMeasurements = bloodGlucoseMeasurementsResult.map(x => ({
        ...x,
        measuredAt: x.measuredAt,
        patient: {_id: x.patientId},
        digestiveState: DigestiveStateMap[x.measurementTime],
        bloodGlucose: {
            value: (+x.bloodGlucoseValue).toFixed(2),
            unit: 'mg/dL',
        },
        manual: x.inputType === 'MANUAL',
        measurementDeviceModel: !!x.sourceId && 'BG1',
        measureResultId: ObjectId.createFromHexString(x._id),
        remark: x.note ? x.note : '',
        // 以下三个字段，暂时无用
        medication: [],
        carbohydratesConsumed: 'nope',
        hadTakenInsulin: 'nope',
    }))
    return {bloodGlucoseMeasurements, treatmentPlans}
}

// const structureCarbohydrates = mealNote => {
//     if (!mealNote) return null
//     return {
//         unit: mealNote.match(/[a-zA-Z]+|[0-9]+/g)[1],
//         value: parseFloat(mealNote),
//     }
// }
//
// const structureMedication = pillNote => {
//     if (!pillNote) return
//     return pillNote
//         .map(y => ({
//             type: y.type,
//             unit: y.value.match(/[a-zA-Z]+|[0-9]+/g)[1],
//             value: parseFloat(y.value),
//         }))
//         .filter(z => z.value !== 0)
// }
//
// const ChineseBoolean = {
//     是: true,
//     否: false,
// }

const convertCamelCaseToUpperCase = str =>
    str.replace(/[A-Z]/, item => `_${item}`).toUpperCase()

const convertObjectToArray = obj =>
    Object.keys(obj).map(value => convertCamelCaseToUpperCase(value))
