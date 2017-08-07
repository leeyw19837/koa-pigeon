import { IContext } from '../types'

export const bloodGlucoseMeasurements = async (_, args, { getDb }: IContext) => {
  const db = await getDb()
  const a = await db.collection('bloodglucoses').find({pillNote: {$exists: 1, $ne: ''} {limit: 50}).toArray()
  return a.map(x => ({...x,
     measuredAt: x.createdAt,
     patient: {_id: x.author},
     relationshipToMealTime: DigestiveStateLookup[x.dinnerSituation],
     bloodGlucose: {value: (+x.bgValue).toFixed(2), unit: 'mmol/L'},
     manual: !!x.source,
     medication: structureMedication(x.pillNote),
    }))
}
const structureMedication = pillNote => {
  if (!pillNote) return
  return pillNote.map(y => ({type: y.type, unit: y.value.match(/[a-zA-Z]+|[0-9]+/g)[1], value: parseFloat(y.value)}))
}
const DigestiveStateLookup = {
  空腹: 'EMPTY_STOMACH',
  早餐前: 'BEFORE_BREAKFAST',
  早饭前: 'BEFORE_BREAKFAST',
  早餐后: 'AFTER_BREAKFAST',
  早饭后: 'AFTER_BREAKFAST',
  午餐前: 'BEFORE_LUNCH',
  午饭前: 'BEFORE_LUNCH',
  午餐后: 'AFTER_LUNCH',
  午饭后: 'AFTER_LUNCH',
  晚饭前: 'BEFORE_DINNER',
  晚餐前: 'BEFORE_DINNER',
  晚饭后: 'AFTER_DINNER',
  晚餐后: 'AFTER_DINNER',
  睡前: 'BEFORE_BED',
  凌晨: 'BEFORE_DAWN',
  半夜: 'BEFORE_DAWN',
  随机: 'RANDOM',
  零食后: 'AFTER_SNACK',
  0: 'UNKNOWN',
  10: 'UNKNOWN',
}
