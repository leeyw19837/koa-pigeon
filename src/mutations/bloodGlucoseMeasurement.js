import freshId from 'fresh-id'
import moment from 'moment'
import { ObjectID } from 'mongodb'
import { taskGen } from '../modules/bloodGlucose'
import { pubsub } from '../pubsub'
import {
  addDelayEvent,
  deleteDelayEvent,
  queryDelayEvent,
} from '../redisCron/controller'
import map from 'lodash/map'
import { DigestiveStateLookup } from '../utils/i18n'
import { maybeCreateFromHexString } from '../utils/maybeCreateFromHexString'
import { insertChat } from '../utils/insertNeedleChatMessage'

export const saveBloodGlucoseMeasurement = async (_, args, { getDb }) => {
  const db = await getDb()

  const {
    patientId,
    bloodGlucose,
    digestiveState,
    measurementDeviceModel,
    measuredAt,
    deviceContext,
  } = args

  const newFormat = {
    patientId,
    bloodGlucose,
    digestiveState,
    measurementDeviceModel,
    measuredAt,
    deviceContext,
  }
  const dinnerSituation = Object.entries(DigestiveStateLookup).find(
    ([key, value]) => value === digestiveState,
  )[0]
  const convertGlucoseTypeToUSString = value => {
    if (!value) return ''
    return `${Math.round(value * 18)}`
  }
  let bgValue = ''
  if (bloodGlucose.unit.toLowerCase() === 'mg/dl') bgValue = bloodGlucose.value

  if (bloodGlucose.unit.toLowerCase() === 'mmol/l')
    bgValue = convertGlucoseTypeToUSString(bloodGlucose.value)

  const oldFormat = {
    bgValue,
    dinnerSituation,
    author: patientId,
    createdAt: measuredAt,
    iGlucoseDataId: freshId(17), // this is forced to unique so this is a hack
  }
  const objectToWrite = {
    ...oldFormat,
    ...newFormat,
  }
  const retVal = await db.collection('bloodglucoses').insertOne(objectToWrite)
  const rz = retVal.ops[0]
  const user = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
    patientState: {
      $exists: 1,
    },
  })
  const mobile = user.username.replace('@ijk.com', '')
  const nickname = user.nickname
  if (user.healthCareTeamId && user.healthCareTeamId.length > 0) {
    if (parseFloat(bgValue) >= 18 * 10) {
      await db.collection('warnings').insertOne({
        bloodglucoseId: rz._id, // 关联的测量记录
        bgValue, // 本次记录的血糖值，转换后
        warningType: 'HIGH_GLUCOSE', // 预备以后有别的警告记录种类
        dinnerSituation,
        patientId,
        nickname,
        gender: user.gender, // 'male/female',
        dateOfBirth: user.dateOfBirth,
        mobile,
        createdAt: new Date(),
        healthCareTeamId: user.healthCareTeamId[0],
      })
    } else if (parseFloat(bgValue) < 18 * 4) {
      await db.collection('warnings').insertOne({
        bloodglucoseId: rz._id, // 关联的测量记录
        bgValue, // 本次记录的血糖值，转换后
        warningType: 'LOW_GLUCOSE', // 预备以后有别的警告记录种类
        dinnerSituation,
        patientId,
        nickname,
        gender: user.gender, // 'male/female',
        dateOfBirth: user.dateOfBirth,
        mobile,
        createdAt: new Date(),
        healthCareTeamId: user.healthCareTeamId[0],
      })
    }
  }
  return !!retVal.result.ok ? retVal.insertedId : null
}
export const saveBloodGlucoseMeasurementNew = async (_, args, context) => {
  const db = await context.getDb()
  const {
    bloodGlucoseValue,
    bloodGlucoseDataSource,
    inputType,
    patientId,
    measurementTime,
    deviceInformation,
    measuredAt = new Date(),
  } = args
  const measureTimeChinese = [
    '早餐前',
    '早餐后',
    '午餐前',
    '午餐后',
    '晚餐前',
    '晚餐后',
    '睡前',
    '凌晨',
  ]
  const measureTimeEng = [
    'BEFORE_BREAKFAST',
    'AFTER_BREAKFAST',
    'BEFORE_LUNCH',
    'AFTER_LUNCH',
    'BEFORE_DINNER',
    'AFTER_DINNER',
    'BEFORE_SLEEPING',
    'MIDNIGHT',
  ]
  const objFirst = {
    bloodGlucoseValue,
    bloodGlucoseDataSource,
    inputType,
    patientId,
    measurementTime,
    deviceInformation,
    measuredAt,
  }
  const frId = new ObjectID()
  const objSecond = {
    _id: String(frId),
    sourceId: String(frId),
    note: '',
    labels: [],
    dataStatus: 'ACTIVE',
    createdAt: measuredAt,
    updatedAt: measuredAt,
  }

  const objectToWrite = {
    ...objFirst,
    ...objSecond,
  }
  const retVal = await db.collection('bloodGlucoses').insertOne(objectToWrite)
  const userId = ObjectID.createFromHexString(patientId)

  console.log('11111++++++++retVal', retVal)
  console.log('22222++++++++userId', userId)

  const patient = await db.collection('users').findOne({ _id: userId })

  if (moment(measuredAt).isAfter(patient.latestBG.measuredAt)) {
    console.log('aaaa++++++++patient', patient.latestBG.measuredAt)
    await db.collection('users').update(
      { _id: userId },
      {
        $set: {
          'latestBG._id': retVal.ops[0]._id,
          'latestBG.bloodGlucoseValue': bloodGlucoseValue,
          'latestBG.measuredAt': measuredAt,
        },
      },
    )
  }

  // 生成干预任务
  const task = await taskGen(objectToWrite)
  if (task) {
    await db.collection('interventionTask').insert(task)
    pubsub.publish('interventionTaskDynamics', {
      ...task,
      _operation: 'ADDED',
    })

    //聊天页面插入task气泡
    const TIME_PERIOD_MAP = {
      BEFORE_BREAKFAST: '早餐前',
      AFTER_BREAKFAST: '早餐后',
      BEFORE_LUNCH: '午餐前',
      AFTER_LUNCH: '午餐后',
      BEFORE_DINNER: '晚餐前',
      AFTER_DINNER: '晚餐后',
      BEFORE_SLEEPING: '睡前',
      MIDNIGHT: '凌晨',
      RANDOM: '随机',
    }
    const summaryOfMeasurements = map(
      task.measurementRecords,
      ({ measurementTime, bloodGlucoseValue }) => {
        console.log(measurementTime, bloodGlucoseValue)
        const timePeriod = TIME_PERIOD_MAP[measurementTime] || measurementTime
        const transformedBG = (bloodGlucoseValue / 18).toFixed(1)
        return `${timePeriod} ${transformedBG}`
      },
    ).join('; ')
    const textContent = `${summaryOfMeasurements}`
    const { _id, patientId, type } = task
    const sendArgs = {
      taskId: _id,
      patientId,
      textContent,
      sourceType: 'FROM_SYSTEM',
      taskType: type,
    }
    await insertChat(_, sendArgs, context)
  }
  // 餐前血糖测量后添加定时事件
  // 只有自动测量和餐前才添加定时事件
  // 添加事件前清除这个患者之前的事件
  // 事件key：pigeon_bg_<patientId>_BEFORE_BREAKFAST_午餐前_hh:mm

  // 2018年07月11日18:12:41根据需求暂停餐前测量两小时提醒
  // if (inputType === 'DEVICE') {
  //   if (
  //     measurementTime.indexOf('BEFORE') > -1 &&
  //     measurementTime != 'BEFORE_SLEEPING'
  //   ) {
  //     console.log('-----------add reids cron job----------------')
  //     const key = `bg_${patientId}_${measurementTime}_${
  //       measureTimeChinese[measureTimeEng.indexOf(measurementTime)]
  //     }_${moment().format('HH:mm')}`
  //     const querykey = `bg_${patientId}`
  //     const existKeys = await queryDelayEvent(querykey)
  //     console.log('*****', existKeys)
  //     if (existKeys && existKeys.length > 0) {
  //       existKeys.forEach(async element => {
  //         await deleteDelayEvent(element)
  //       })
  //     }
  //     await addDelayEvent(key, 60 * 60 * 2)
  //   }
  // }

  const rz = retVal.ops[0]
  const user = await db.collection('users').findOne({
    _id: ObjectID.createFromHexString(patientId),
    patientState: {
      $exists: 1,
    },
  })
  if ('NEEDLE_BG1' === bloodGlucoseDataSource && user && !user.isUseBg1) {
    await db.collection('users').update(
      {
        _id: user._id,
      },
      {
        $set: {
          isUseBg1: true,
        },
      },
    )
  }
  const mobile = user.username.replace('@ijk.com', '')
  const nickname = user.nickname
  if (user.healthCareTeamId && user.healthCareTeamId.length > 0) {
    const isTooDamnHigh = parseFloat(bloodGlucoseValue) >= 18 * 10
    const isTooDamnLow = parseFloat(bloodGlucoseValue) < 18 * 4
    if (isTooDamnHigh || isTooDamnLow) {
      const warning = {
        bloodglucoseId: rz._id, // 关联的测量记录
        bgValue: bloodGlucoseValue, // 本次记录的血糖值，转换后
        dinnerSituation:
          measureTimeChinese[measureTimeEng.indexOf(measurementTime)],
        patientId,
        nickname,
        gender: user.gender, // 'male/female',
        dateOfBirth: user.dateOfBirth,
        mobile,
        createdAt: new Date(),
        healthCareTeamId: user.healthCareTeamId[0],
        warningType: '',
      }
      if (isTooDamnHigh) {
        // console.log('high', bloodGlucoseValue)
        warning.warningType = 'HIGH_GLUCOSE'
      } else if (isTooDamnLow) {
        // console.log('low', bloodGlucoseValue)
        warning.warningType = 'LOW_GLUCOSE'
      }
      await db.collection('warnings').insertOne(warning)
      pubsub.publish('warningAdded', { warningAdded: warning })
    }
  }
  context.response.set('effect-types', 'saveBloodGlucoseMeasurementNew')
  return !!retVal.result.ok ? retVal.insertedId : null
}

export const updateRemarkOfBloodglucoses = async (_, args, { getDb }) => {
  const db = await getDb()

  const { _id, remark } = args

  const retVal = await db
    .collection('bloodglucoses')
    .update(
      { _id: maybeCreateFromHexString(_id) },
      { $set: { remark, updatedAt: new Date() } },
    )
  return !!retVal.result.ok
}
export const updateRemarkOfBloodglucosesNew = async (_, args, { getDb }) => {
  const db = await getDb()

  const { _id, remark, updatedAt } = args

  const retVal = await db
    .collection('bloodGlucoses')
    .update(
      { _id: String(_id) },
      { $set: { note: remark, updatedAt: new Date() } },
    )
  return !!retVal.result.ok
}

export const deleteOfBloodglucoses = async (_, args, { getDb }) => {
  const db = await getDb()

  const { _id } = args
  const retValue = await db.collection('bloodglucoses').deleteOne({
    _id: maybeCreateFromHexString(_id),
  })
  await db.collection('warnings').deleteOne({
    bloodglucoseId: maybeCreateFromHexString(_id),
  })
  return !!retValue.result.ok
}

export const logicalDeleteOfBloodglucoses = async (_, args, { getDb }) => {
  const db = await getDb()

  const { _id } = args
  const retValue = await db
    .collection('bloodGlucoses')
    .updateOne(
      { _id },
      { $set: { dataStatus: 'DELETED', updatedAt: new Date() } },
    )

  await db.collection('warnings').deleteOne({
    bloodglucoseId: maybeCreateFromHexString(_id),
  })
  return !!retValue.result.ok
}
