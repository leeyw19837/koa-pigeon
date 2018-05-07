
import { IContext } from '../types'

export const treatmentPlan = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  const result = await db
    .collection('bg_measure_module')
    .find({ patientId: args.patientId })
    .sort({ createdAt: -1 })
    .toArray()

  const convertCamelCaseToUpperCase = str =>
    str.replace(/[A-Z]/, item => `_${item}`).toUpperCase()

  const convertObjectToArray = obj =>
    Object.keys(obj).map(value => convertCamelCaseToUpperCase(value))

  return result.map(item => ({
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
}
