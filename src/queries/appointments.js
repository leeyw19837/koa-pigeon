import { ObjectID } from 'mongodb'
import isEmpty from 'lodash/isEmpty'
import get from 'lodash/get'

const moment = require('moment')

export const monthlyAppointments = async (_, args, context) => {
  const db = await context.getDb()
  const { monthStr, healthCareTeamId } = args
  const $match = {
    healthCareTeamId: { $ne: null },
    appointmentTime: { $ne: null },
    patientState: { $nin: ['REMOVED', 'ARCHIVED'] },
  }
  if (monthStr) {
    const startOfMonth = moment(monthStr || new Date())
      .startOf('month')
      .toDate()
    const endOfMonth = moment(monthStr || new Date())
      .endOf('month')
      .toDate()
    $match.appointmentTime.$gt = startOfMonth
    $match.appointmentTime.$lte = endOfMonth
  }
  if (healthCareTeamId) {
    $match.healthCareTeamId = healthCareTeamId
  }
  const result = await db
    .collection('appointments')
    .aggregate([
      {
        $match,
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$appointmentTime' },
            },
            healthCareTeamId: '$healthCareTeamId',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          details: {
            $push: {
              healthCareTeamId: '$_id.healthCareTeamId',
              count: '$count',
            },
          },
          count: { $sum: '$count' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          details: 1,
          count: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ])
    .toArray()

  return result
}

/**
 * 当加诊的时候，需要判断是否有可用诊
 * 1. 如果在加诊时间一周内，有一个加诊，把此加诊挪到当天
 * 2. 如果加诊的时间已经是在规律复诊范围内(75~112天), 把即将要来的复诊或者年诊挪到今天
 * 3. 如果在此时间内既找到可用加诊和复诊，是否需要把加诊删掉 ？
 * 4. 如果检测到此用户没有下次可用复诊或者年诊(业务流程导致没有下次预约)是否提示照护师 ？
 * 5. 如果加诊的时间大于了复诊时间且规范复诊的最大时间，
 * @param {*} _
 * @param {*} param1
 * @param {*} context
 */

const getAvailableAppointment = async ({ patientId, appointmentTime }) => {
  const appointments = await db
    .collection('appointments')
    .find({ patientId, appointmentTime: { $exists: true } })
    .sort({ appointmentTime: -1 })
    .toArray()

  const availableAdditions = appointments.filter(
    o => !o.isOutPatient && o.type === 'addition',
  )

  const availableQuarter = appointments.filter(
    o => !o.isOutPatient && /quarter|year/g.test(o.type),
  )[0]

  const lastCheckInAp =
    appointments.filter(o => o.isOutPatient && o.type !== 'addition')[0] || {}

  const lastApTime = lastCheckInAp.appointmentTime

  const circleStartAt = moment(lastApTime).add(75, 'days')
  const circleEndAt = moment(lastApTime).add(112, 'days')
  console.log(circleStartAt, circleEndAt)
  const result = {
    flag: 'DIRECT',
    additions: availableAdditions,
    nextAppointment: availableQuarter,
    circleStartAt,
    circleEndAt,
  }
  /**
   * DIRECT 直接创建
   * DIRECT_CQ 直接创建加诊，并且需要建一个规律的复诊
   * DISABLE 不能创建
   * QRA_INVALUE 复诊可以代替加诊,并且在规律复诊范围内
   * QRA_OUTVALUE 复诊可以代替加诊,不在规律复诊范围内
   * CQRA_INTVALUE 创建复诊替代加诊,并且在规律复诊范围内
   * CQRA_OUTVALUE 创建复诊替代加诊,不在规律复诊范围内
   */
  // 有可用预约
  if (!isEmpty(availableQuarter)) {
    const nextApTime = availableQuarter.appointmentTime
    const maxAvailableTime = moment(circleEndAt).isAfter(nextApTime)
      ? circleEndAt
      : nextApTime

    // 可以加诊，上次复诊已经小于当天了，期待下次复诊能规律
    if (moment().isAfter(maxAvailableTime)) {
      result.flag = 'QRA_OUTVALUE'
    } else if (moment(nextApTime).isBefore(circleStartAt)) {
      if (moment(appointmentTime).isBefore(nextApTime)) {
        result.flag = 'DIRECT'
      } else if (moment(appointmentTime).isBetween(nextApTime, circleStartAt)) {
        result.flag = 'QRA_OUTVALUE'
      } else if (
        moment(appointmentTime).isBetween(circleStartAt, circleEndAt)
      ) {
        result.flag = 'QRA_INVALUE'
      } else {
        result.flag = 'QRA_OUTVALUE'
      }
    } else if (moment(nextApTime).isBetween(circleStartAt, circleEndAt)) {
      // 下次复诊时间在规律复诊时间之内
      // 加诊时间小于75天
      if (moment(appointmentTime).isBefore(circleStartAt)) {
        // 直接创建加诊
        result.flag = 'DIRECT'
      } else if (
        // 加诊时间大于75天小于112
        moment(appointmentTime).isBetween(circleStartAt, circleEndAt)
      ) {
        // 复诊可以替代加诊，且在规律复诊范围内的
        result.flag = 'QRA_INVALUE'
      } else {
        result.flag = 'DISABLE'
        //加诊时间大于112
        // 检测到该患者存在还未进行的下次复诊(888), 你现在还不能为患者加诊。 不能加诊，这样的话就会出圈
      }
    } else if (moment(nextApTime).isAfter(circleEndAt)) {
      // 下次复诊时间在112天之外
      if (moment(appointmentTime).isBefore(circleStartAt)) {
        // 直接创建加诊
        result.flag = 'DIRECT'
      } else if (
        moment(appointmentTime).isBetween(circleStartAt, circleEndAt)
      ) {
        // 复诊可以替代加诊，且在规律复诊范围内的
        result.flag = 'QRA_INVALUE'
      } else {
        // 复诊可以替代加诊，但不在规律复诊范围内的
        result.flag = 'QRA_OUTVALUE'
      }
    }
  } else {
    // 可以加诊，上次复诊已经小于当天了，期待下次复诊能规律
    if (moment().isAfter(circleEndAt)) {
      result.flag = 'CQRA_OUTVALUE'
    } else if (moment(appointmentTime).isBefore(circleStartAt)) {
      // 加诊时间小于75天
      // 直接加诊并在价值圈（75~112）创建复诊
      result.flag = 'DIRECT_CQ'
    } else if (
      // 加诊时间大于75天小于112
      moment(appointmentTime).isBetween(circleStartAt, circleEndAt)
    ) {
      // 创建复诊在规律复诊范围内的
      result.flag = 'CQRA_INVALUE'
    } else {
      // 创建复诊但不在规律复诊范围内的
      result.flag = 'CQRA_OUTVALUE'
    }
  }
  console.log(result, '@@@circleEndAt')
  return result
}

const getOutpatientInValue = async ({
  patientId,
  circleStartAt,
  circleEndAt,
}) => {
  const patient = await db
    .collection('users')
    .findOne({ _id: ObjectID.createFromHexString(patientId) })
  if (!patient) {
    throw new Error(`Error: 无此患者${patientId}!`)
  }
  const healthCareTeamId = get(patient, 'healthCareTeamId.0')

  const ops = await db
    .collection('outpatients')
    .find({
      healthCareTeamId,
      outpatientDate: {
        $gte: moment(circleStartAt)._d,
        $lte: moment(circleEndAt)._d,
      },
    })
    .toArray()
  return ops.length ? ops[0]._id : null
}

const getBtns = ({ additions, type }) => {
  const defaultBtns = additions.length
    ? [
        {
          key: 'clear_addition',
          label: '创建加诊并且清除其他加诊',
        },
        {
          key: 'direct',
          label: '创建加诊',
        },
      ]
    : [
        {
          key: 'direct',
          label: '创建加诊',
        },
      ]
  const btns = defaultBtns
  if (type === 'QRA') {
    btns.unshift({
      key: 'move_quarter',
      label: '移动该复诊至此日',
    })
  } else if (type === 'CQRA') {
    btns.unshift({
      key: 'create_quarter',
      label: '创建复诊',
    })
  }
  return btns
}

export const getAdditionInfo = async (_, { patientId, appointmentTime }) => {
  const {
    flag,
    additions,
    nextAppointment,
    circleStartAt,
    circleEndAt,
  } = await getAvailableAppointment({ patientId, appointmentTime })
  const result = { flag, additions, nextAppointment }
  if (flag === 'DIRECT_CQ') {
    const opId = await getOutpatientInValue({
      patientId,
      circleStartAt,
      circleEndAt,
    })
    result.outpatientId = opId
  }
  return result
}
