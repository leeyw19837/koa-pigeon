
import { DigestiveStateLookup } from '../utils/i18n'
export const bloodGlucoseMeasurements = async (
  _,
  args,
  { getDb },
) => {
  const db = await getDb()
  const cursor = { author: args.patientId }
  if (args.from && args.to) {
    Object.assign(cursor, { createdAt: { $gt: args.from, $lt: args.to } })
  }

  const a = await db
    .collection('bloodglucoses')
    .find(cursor)
    .sort({ createdAt: -1 })
    .toArray()
  return a.map(x => ({
    ...x,
    measuredAt: x.createdAt,
    patient: { _id: x.author },
    digestiveState: DigestiveStateLookup[x.dinnerSituation],
    bloodGlucose: { value: (+x.bgValue).toFixed(2), unit: 'mg/dL' },
    manual: !!x.source,
    medication: structureMedication(x.pillNote),
    measurementDeviceModel: !!x.iGlucoseDataId && 'BG1',
    carbohydratesConsumed: structureCarbohydrates(x.mealNote),
    hadTakenInsulin: ChineseBoolean[x.insulinInjection],
  }))
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
