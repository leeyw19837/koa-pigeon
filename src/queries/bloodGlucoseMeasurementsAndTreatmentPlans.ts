import { IContext } from '../types'
import { DigestiveStateLookup } from '../utils/i18n'

export const bloodGlucoseMeasurementsAndTreatmentPlans = async (
  _,
  args,
  { getDb }: IContext,
) => {
  const db = await getDb()
  const cursor = { author: args.patientId }
  if (args.from && args.to) {
    Object.assign(cursor, {
      createdAt: { $gt: args.from, $lt: args.to },
    })
  }

  const bloodGlucoseMeasurementsResult = await db
    .collection('bloodglucoses')
    .find(cursor)
    .sort({ createdAt: -1 })
    .toArray()

  const treatmentPlansResult = await db
    .collection('bg_measure_module')
    .find({ patientId: args.patientId })
    .sort({ createdAt: -1 })
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

  const bloodGlucoseMeasurements = bloodGlucoseMeasurementsResult.map(x => ({
    ...x,
    measuredAt: x.createdAt,
    patient: { _id: x.author },
    digestiveState: DigestiveStateLookup[x.dinnerSituation],
    bloodGlucose: {
      value: (+x.bgValue).toFixed(2),
      unit: 'mg/dL',
    },
    manual: !!x.source,
    medication: structureMedication(x.pillNote),
    measurementDeviceModel: !!x.iGlucoseDataId && 'BG1',
    carbohydratesConsumed: structureCarbohydrates(x.mealNote),
    hadTakenInsulin: ChineseBoolean[x.insulinInjection],
    remark:x.remark?x.remark:""
  }))
  return { bloodGlucoseMeasurements, treatmentPlans }
}

const structureCarbohydrates = mealNote => {
  if (!mealNote) return null
  return {
    unit: mealNote.match(/[a-zA-Z]+|[0-9]+/g)[1],
    value: parseFloat(mealNote),
  }
}

const structureMedication = pillNote => {
  if (!pillNote) return
  return pillNote
    .map(y => ({
      type: y.type,
      unit: y.value.match(/[a-zA-Z]+|[0-9]+/g)[1],
      value: parseFloat(y.value),
    }))
    .filter(z => z.value !== 0)
}

const ChineseBoolean = {
  是: true,
  否: false,
}

const convertCamelCaseToUpperCase = str =>
  str.replace(/[A-Z]/, item => `_${item}`).toUpperCase()

const convertObjectToArray = obj =>
  Object.keys(obj).map(value => convertCamelCaseToUpperCase(value))
