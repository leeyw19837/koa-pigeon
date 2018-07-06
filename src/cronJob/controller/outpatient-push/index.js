import freshId from 'fresh-id'
import {healthCareTeamMap} from '../constants'
import {multiSendMiPush} from '../../../mipush/multiMiPush'
import {pubsub} from '../../../pubsub'
import { ObjectID } from 'mongodb'

const moment = require('moment')

const periodTextMap = {
  'AFTER_BREAKFAST': 'BEFORE_BREAKFAST',
  'AFTER_LUNCH': 'BEFORE_LUNCH',
  'AFTER_DINNER': 'BEFORE_DINNER',
  'BEFORE_BREAKFAST': 'AFTER_BREAKFAST',
  'BEFORE_LUNCH': 'AFTER_LUNCH',
  'BEFORE_DINNER': 'AFTER_DINNER',
}

const getFilteredPatients = (appointedPatients,day,hour) => {
  // console.log('------getFilteredPatients-----')

  let dayInt = parseInt(day)
  let hourInt = parseInt(hour)

  let filteredPatients = []
  let currentDay = moment(moment().subtract(dayInt, 'days')).isoWeekday()
  let currentHourOfDay = hourInt!==0 ? hourInt : moment(moment().subtract(dayInt, 'days')).hour()
  let amOrPm = currentHourOfDay < 12 ? 'morning' : 'afternoon'

  // console.log('------getFilteredPatients-----currentDay,',currentDay,'currentHourOfDay',currentHourOfDay)

  // 当前是周一，时段为早上，检查是否是门诊后：过滤条件：
  // [1] 周五诊(当前天减去3天的日期与appointTime的日期一致)
  // [2] 周四诊(当前天减去4天的日期与appointTime的日期一致)
  if (currentDay === 1 && amOrPm === 'morning') {
    filteredPatients = appointedPatients.filter(o => {
      return moment(o.appointmentTime).isSame(moment().subtract(3+dayInt, 'days'), 'day')
        || moment(o.appointmentTime).isSame(moment().subtract(4+dayInt, 'days'), 'day')

    })
  }

  // 当前是周四，时段为早上，检查是否是门诊后：过滤条件：
  // 周一诊(当前天减去3天的日期与appointTime的日期一致)
  if (currentDay === 4 && amOrPm === 'morning') {
    filteredPatients = appointedPatients.filter(o => {
      return moment(o.appointmentTime).isSame(moment().subtract(3+dayInt, 'days'), 'day')
    })
  }

  // 当前是周五，时段为早上，检查是否是门诊后：过滤条件：
  // [1] 周二诊(当前天减去3天的日期与appointTime的日期一致)
  // [2] 周三上午诊(当前天减去2天的日期与appointTime的日期一致)
  if (currentDay === 5 && amOrPm === 'morning') {
    filteredPatients = appointedPatients.filter(o => {
      return moment(o.appointmentTime).isSame(moment().subtract(3+dayInt, 'days'), 'day')
        || moment(o.appointmentTime).isSame(moment().subtract(2+dayInt, 'days'), 'day')
    })
  }

  // 当前是周五，时段为下午，检查是否是门诊后：过滤条件：
  // 周三下午诊(当前天减去2天的日期与appointTime的日期一致)
  if (currentDay === 5 && amOrPm === 'afternoon') {
    filteredPatients = appointedPatients.filter(o => {
      return moment(o.appointmentTime).isSame(moment().subtract(2+dayInt, 'days'), 'day')
    })
  }

  // console.log('filteredPatients',filteredPatients)

  return filteredPatients
}

const getOutPatientAmOrPm = (healthCareTeamId, appointmentTime) => {
  // console.log('------getOutPatientAmOrPm-----,healthCareTeamId=',healthCareTeamId,'appointmentTime=',appointmentTime,'moment(appointmentTime).isoWeekday()=',moment(appointmentTime).isoWeekday())

  return healthCareTeamMap[healthCareTeamId][moment(appointmentTime).isoWeekday()]
}

/**
 * 检查是否门诊后
 * @returns {Promise<boolean>}
 */
const getAfterOutpatientPatients = async (day,hour) => {
  // console.log('------getAfterOutpatientPatients-----')

  // 为了减少数据运算，只从数据库中筛选最近6天的预约记录
  let startAt = moment(moment().subtract(parseInt(day)+6, 'days')).startOf('day')._d
  let endAt = moment(moment().subtract(parseInt(day), 'days')).endOf('day')._d

  // console.log('------getAfterOutpatientPatients-----startAt',startAt,'endAt',endAt)

  let appointedPatients = await db
    .collection('appointments')
    .find({
      isOutPatient: true,
      $and:[
        {
          healthCareTeamId: {$exists: true}
          },
        {
          healthCareTeamId: {$ne: 'ihealthCareTeam'},
        }
      ],
      appointmentTime: {
        $gte: startAt,
        $lt: endAt,
      },
    })
    .toArray()

  // console.log('appointedPatients.length',appointedPatients.length)

  // appointedPatients.forEach(item=>// console.log(item))

  return getFilteredPatients(appointedPatients,day,hour)
}

/**
 * 检查是否有BG测量记录
 * @param patientId
 * @param outPatientAmOrPm
 * @param appointmentTime
 * @returns {Promise<TSchema[]>}
 */
const checkWhetherExistsBGRecords = async (patientId, outPatientAmOrPm, appointmentTime,day) => {
  // console.log('------checkWhetherExistsBGRecords-----')

  let timeBoundary = (outPatientAmOrPm === 'morning')
    ? moment(appointmentTime).set('hour',13).set('minute',0).set('second',0).set('millisecond',0).toDate()
    : moment(appointmentTime).set('hour',18).set('minute',0).set('second',0).set('millisecond',0).toDate()

  // console.log('timeBoundary--',timeBoundary,'moment(moment().subtract(parseInt(day))).toDate()',moment(moment().subtract(parseInt(day), 'days')).toDate())

  let query = {
    patientId: patientId,
    measuredAt: {
      $gte:timeBoundary,
      $lt:moment(moment().subtract(parseInt(day), 'days')).toDate()
    },
    dataStatus: 'ACTIVE',
    bloodGlucoseDataSource:/NEEDLE/
  }
  let bgRecords = await db
    .collection('bloodGlucoses')
    .find(query)
    .toArray()

  // console.log('bgRecords.length',bgRecords.length)

  return bgRecords
}

/**
 * 组合消息并发出
 * @returns {Promise<boolean>}
 */
const assembleMsgsAndPubsub = async (filteredOutpatientPatients,day) => {
  // console.log('------assembleMsgsAndPubsub-----')

  // console.log('filteredOutpatientPatients.length',filteredOutpatientPatients.length)

  let messageArray = []

  for (let i=0;i<filteredOutpatientPatients.length;i++) {
    let {patientId, healthCareTeamId, appointmentTime} = filteredOutpatientPatients[i]

    let messageWordsAndSourceType = {}

    let outPatientAmOrPm = getOutPatientAmOrPm(healthCareTeamId,appointmentTime)
    let bgRecords = await checkWhetherExistsBGRecords(patientId, outPatientAmOrPm, appointmentTime,day)
    if (bgRecords && bgRecords.length>0){
      let whetherPairingRecords = await checkWhetherExistsParingMeasurements(bgRecords)
      let triggerResultPageWords = checkWhetherExistsResultEvents(bgRecords)
      if (!triggerResultPageWords){
        let medicineCaseModifySituation = await checkWhetherModifiedMedicines(patientId)
        messageWordsAndSourceType = getMessageTextWithBgRecords(whetherPairingRecords,medicineCaseModifySituation)
      }else {
        continue
      }
    }else {
      let whetherUseBg1 = await checkWhetherUseBg1(patientId)
      let medicineCaseModifySituation = await checkWhetherModifiedMedicines(patientId)
      messageWordsAndSourceType = getMessageTextNoBgRecords(whetherUseBg1,medicineCaseModifySituation)
    }

    let messageObject = await assembleMessageObject(patientId,messageWordsAndSourceType)

    // console.log('messageObject',messageObject)
    
    if (messageObject!==null){
      messageArray.push(messageObject)
    }
  }

  // console.log('messageArray.length',messageArray.length)

  // 发送Muti推送消息
  if (messageArray.length>0){
    const insertResult = await db
      .collection('needleChatMessages')
      .insert(messageArray)
    
      await multiSendMiPush(messageArray, 'TEXT')
      pubChatMessages(messageArray)

      return '插入needleChatMessage表中 '+insertResult.insertedCount+' 条数据！'
  }
}

/**
 * 检查是否有BG1
 * @returns {Promise<boolean>}
 */
const checkWhetherUseBg1 = async (patientId) => {
  // console.log('------checkWhetherUseBg1-----')

  let userCount = await db
    .collection('users')
    .find({
      _id:ObjectID.createFromHexString(patientId),
      $or:[
        {
          isUseBg1:true
        },
        {
          $and:[
            {$or:[{isUseBg1:false},{isUseBg1:{$exists:false}}]},{notUseBg1Reason:{$exists:true}},{notUseBg1Reason:'gotButNoUse'}
          ]
        }
      ]
    })
    .count()

  return (userCount !== 0)
}

/**
 * 检查是否调整了用药（新增、修改、停止）
 * @returns {Promise<boolean>}
 */
const checkWhetherModifiedMedicines = async (patientId) => {
  // console.log('------checkWhetherModifiedMedicines-----')

  let medicineCaseRecords = await db
    .collection('caseRecord')
    .find({
      patientId:patientId
    })
    .sort({caseRecordAt: -1})
    .limit(1)
    .toArray()

  if(medicineCaseRecords.length) {
    let modifiedMedicine = medicineCaseRecords[0].caseContent.prescription.medicines.filter(o =>
      o.status === 'modify'
      || o.status === 'add'
      || o.status === 'stop')
    return modifiedMedicine.length && modifiedMedicine.length > 0
  }else {
    return false
  }
}

/**
 * 检查是否有配对测量记录
 * @returns {Promise<boolean>}
 */
const checkWhetherExistsParingMeasurements = async (bgRecords) => {
  // console.log('------checkWhetherExistsParingMeasurements-----')

  let result = false
  for (let i=0; i<bgRecords.length;i++){
    for (let j=0; j<i; j++){
      if (bgRecords[j].measurementTime === periodTextMap[bgRecords[i].measurementTime]
        && moment(bgRecords[i].measuredAt).isSame(moment(bgRecords[j].measuredAt),'day')) {
          result = true
          break
      }
    }
  }
  return result
}

/**
 * 检查血糖记录是否触发了结果页测量话术
 * @return boolean
 */
const checkWhetherExistsResultEvents = bgRecords => {
  // console.log('------checkWhetherExistsResultEvents-----')
  let filteredBgRecords = bgRecords.filter(bgRecord =>
    bgRecord.diagnoseType
    && (bgRecord.diagnoseType === 'a'
    || bgRecord.diagnoseType === 'b'
    || bgRecord.diagnoseType === 'c'
    || bgRecord.diagnoseType === 'd'
    || bgRecord.diagnoseType === 'e'
    || bgRecord.diagnoseType === 'f'))
  return filteredBgRecords.length && filteredBgRecords.length > 0
}

/**
 * 有BG测量结果的情形---获取消息文本内容
 * @returns {Object}
 */
const getMessageTextWithBgRecords = (whetherPairingRecords,medicineCaseModifySituation) => {
  // console.log('------getMessageTextWithBgRecords-----')

  let text =''
  let sourceType =''
  if (whetherPairingRecords){
    if (medicineCaseModifySituation){
      text = '看您最近血糖不错，新调整方案还挺适合您的，请遵医嘱继续保持测量，有什么问题请随时和我们沟通。'
      sourceType = 'AOP_5'
    }else {
      text = '看您最近血糖控制不错，看来您在饮食或者运动方面很是注意，您觉得对您血糖控制帮助最大的是什么呢？'
      sourceType = 'AOP_6'
    }
  }else {
    if (medicineCaseModifySituation){
      text = '医生最近给您调整了用药方案，建议您配对监测血糖，医生会根据您一餐前后血糖的变化来评估药物以及饮食是否合理，配对测量对您来说有困难吗？'
      sourceType = 'AOP_7'
    }else {
      text = '您的测量结果我已经收到，但医生建议您配对测量血糖，这样更有利于帮您判断饮食、运动或者药物存在的问题，您觉得配对测量有困难吗？'
      sourceType = 'AOP_8'
    }
  }
  return {
    text:text,
    sourceType:sourceType
  }
}

/**
 * 无BG测量结果的情形---获取消息文本内容
 * @returns {Object}
 */
const getMessageTextNoBgRecords = (whetherUseBg1, medicineCaseModifySituation) => {
  // console.log('------getMessageTextNoBgRecords-----')

  let text =''
  let sourceType =''
  if (whetherUseBg1){
    if (medicineCaseModifySituation){
      text = '您好，想看一下新调整用药方案对您血糖控制的情况，但是门诊后没有收到您的血糖记录，请问您在测量上有什么困难吗？'
      sourceType = 'AOP_1'
    }else {
      text = '您好，近两天没有收到您的血糖记录，请问您在测量上有困难吗？'
      sourceType = 'AOP_2'
    }
  }else {
    if (medicineCaseModifySituation){
      text = '您好，想看一下新调整用药方案对您血糖控制的情况，如门诊沟通，您可以通过护血糖APP手动上传数据，不知道是没有测量还是不会使用手动上传功能呢？'
      sourceType = 'AOP_3'
    }else {
      text = '如门诊沟通，您可以通过护血糖APP手动上传数据，我会结合数据帮您分析一下饮食、运动、药物存在的问题，但最近没有收到您血糖记录，不知道是没有测量还是不会使用手动上传功能呢？'
      sourceType = 'AOP_4'
    }
  }
  return {
    text:text,
    sourceType:sourceType
  }
}

/**
 * 组合消息实体
 * @returns {Object}
 */
const assembleMessageObject = async (patientId, messageObject) => {
  // console.log('------assembleMessageObject-----')

  let chatRoomId = await getChatRoomId(patientId)
  if (chatRoomId!==''){
    return {
      _id:freshId(),
      messageType: 'TEXT',
      text: messageObject.text,
      senderId: '66728d10dc75bc6a43052036',
      createdAt: new Date(),
      chatRoomId: chatRoomId,
      sourceType: messageObject.sourceType,
    }
  }
  return null
}

/**
 * 获取聊天室ID
 * @param patientId
 * @returns {Promise<*>}
 */
const getChatRoomId = async (patientId) => {
  // console.log('------getChatRoomId-----')

  // let user = await db
  //   .collection('users')
  //   .find({
  //     _id:ObjectID.createFromHexString(patientId),
  //     needleChatRoomId:{$exists:true}
  //   })
  //   .toArray()
  // if(user && user.length>0){
  //   return user[0].needleChatRoomId
  // }else {
  //   return ''
  // }

  let chatRoomInfos = await db
    .collection('needleChatRooms')
    .find({})
    .toArray()

  let chatRoomIdInfo = chatRoomInfos.filter(o=>{
    return o.participants[0].userId === patientId || o.participants[1].userId === patientId
  })

  if (chatRoomIdInfo && chatRoomIdInfo.length>0){
    return chatRoomIdInfo[0]._id
  }else {
    return ''
  }
}

/**
 * PubSub
 * @param chatMessages
 */
const pubChatMessages = chatMessages => {
  // console.log('------pubChatMessages-----')

  chatMessages.forEach(chatMsg => {
    pubsub.publish('chatMessageAdded', { chatMessageAdded: chatMsg })
  })
}

export const sendOutpatientPushMessages = async (day,hour) => {
  // console.log('------sendOutpatientPushMessages-----')

  // 第一步：过滤已经就诊的患者
  let filteredOutpatientPatients = await getAfterOutpatientPatients(day,hour)

  // 第二步：针对已经就诊的患者，组合聊天消息并发送
  return await assembleMsgsAndPubsub(filteredOutpatientPatients,day)
}
