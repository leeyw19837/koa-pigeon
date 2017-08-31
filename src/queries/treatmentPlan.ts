import moment = require('moment')

import { IContext } from '../types'

export const treatmentPlan = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  const result = await db
    .collection('bg_measure_module')
    .find({ patientId: args.patientId })
    .toArray()

  const convertCamelCaseToUpperCase = str =>
    str.replace(/[A-Z]/, item => `_${item}`).toUpperCase()

  const convertObjectToArray = obj =>
    Object.keys(obj).map(value => convertCamelCaseToUpperCase(value))

  return result.map(item => ({
    startAt: item.startAt,
    endAt: item.endAt,
    Monday: convertObjectToArray(item.Monday),
    Tuesday: convertObjectToArray(item.Tuesday),
    Wednesday: convertObjectToArray(item.Wednesday),
    Thursday: convertObjectToArray(item.Thursday),
    Friday: convertObjectToArray(item.Friday),
    Saturday: convertObjectToArray(item.Saturday),
    Sunday: convertObjectToArray(item.Sunday),
  }))
}
