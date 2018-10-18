const moment = require('moment')

export const isBetween = (baseTime, date, isDelay) => {
  const startAt = moment(baseTime).startOf('day')._d
  const endAt = moment(baseTime)
    .add(isDelay ? 10 : 0, 'days')
    .endOf('day')._d
  return (
    moment(date).isBetween(startAt, endAt) ||
    moment(baseTime).isSame(date, 'day')
  )
}

/**
 * 病历，预约，就诊状态表和足评都应是同一天做完的，不太可能是后天补录进去的
 * 胰岛素，营养，量表这种，可能是当天没来得及，后面补进去的，所以比较的时间是往后推10天左右
 * @param {*} defaultParam
 * @param {*} extraObj
 */
export const getSpecialData = (defaultParam, extraObj) => {
  const { outpatientDate, patientId } = defaultParam
  const { dateProperty, data, isDelay, isWho, status } = extraObj
  if (!data) {
    console.log(dateProperty)
  }
  const key = isWho ? 'who' : 'patientId'
  return data.filter(
    o =>
      o[key] === patientId &&
      (!status || status !== 'delete') &&
      isBetween(outpatientDate, o[dateProperty], isDelay),
  )
}

/**
 * 1. 对于初诊的患者，可能当次没有检查糖化，可能半个月或者一个月前检查过的
 *    但是半个月或者一个月前检查过的
 *    这种其实也应该算到当次门诊中
 * 2. 对于复诊的患者，可能当天结果没出来，导致后面几天补录进去的
 *    这种情况往后推15天之内的也算做这次门诊的数据
 * @param {*} status
 * @param {*} outpatientDate
 * @param {*} cinicalLabResults
 * @param {*} patientId
 */
export const getClinLabResult = (
  status,
  outpatientDate,
  cinicalLabResults,
  patientId,
) => {
  return cinicalLabResults.filter(o => {
    let endAt = moment(outpatientDate).add(15, 'days')
    let startAt = moment(outpatientDate).subtract(
      status === 'first' ? 30 : 15,
      'days',
    )
    return (
      o.patientId === patientId && moment(o.testDate).isBetween(startAt, endAt)
    )
  })
}
