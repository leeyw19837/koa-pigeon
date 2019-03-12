import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import reduce from 'lodash/reduce'
import { maybeCreateFromHexString } from '../utils/maybeCreateFromHexString'
import moment from 'moment'
import axios from 'axios'
import { getMeasureFeedback } from '../cronJob/controller/getMeasureFeedback'
import { getBlogsByIdArray } from '../queries/article'

const getCondition = async ({ filter }, db) => {
  const { namePattern, cdeId, isRecentCLR, isContinuousNonMonitor } = filter
  let condition = {
    patientState: {
      $nin: ['REMOVED', 'POTENTIAL'],
    },
    roles: {
      $exists: 0,
    },
  }
  if (namePattern) {
    const reg = {
      $regex: namePattern,
    }
    condition.$or = [
      {
        nickname: reg,
      },
      {
        'pinyinName.full': reg,
      },
      {
        'pinyinName.short': reg,
      },
    ]
  }
  if (cdeId) condition.cdeId = cdeId

  if (isRecentCLR) {
    // console.log('aaaa=====isRecentCLR', isRecentCLR)
    condition['latestCLR.glycatedHemoglobin'] = { $gte: '7.0' }
  }

  if (isContinuousNonMonitor) {
    const timeOf14Ago = new Date(moment().subtract(13, 'days'))
    // console.log('aaaa=====isContinuousNonMonitor', timeOf14Ago)
    condition['latestBG.measuredAt'] = { $lt: timeOf14Ago }
  }

  return condition
}

export const PatientPagination = {
  total: async (pp, _, { getDb }) => {
    const db = await getDb()
    const condition = await getCondition(pp, db)
    return await db.collection('users').count(condition)
    // return 0
  },
  patients: async (pp, _, { getDb }) => {
    const db = await getDb()
    const condition = await getCondition(pp, db)
    const { startIndex, stopIndex } = pp.slice
    return await db
      .collection('users')
      .find(condition)
      .sort({ 'pinyinName.initial': 1 })
      .skip(startIndex)
      .limit(stopIndex - startIndex + 1)
      .toArray()
  },
  catalog: async (pp, _, { getDb }) => {
    const db = await getDb()
    const condition = await getCondition(pp, db)
    const data = await db
      .collection('users')
      .aggregate([
        {
          $match: condition,
        },
        {
          $group: {
            _id: '$pinyinName.initial',
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray()
    return data.reduce(
      ({ index, result }, curr) => {
        const newResult = [
          ...result,
          {
            letter: curr._id ? curr._id.toUpperCase() : '~',
            index,
          },
        ]
        const nextIndex = index + curr.count
        return { index: nextIndex, result: newResult }
      },
      {
        index: 0,
        result: [],
      },
    ).result
  },
}

export const Patient = {
  footAssessmentPhotos: async (patient, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('photos')
      .find({
        patientId: patient._id.toString(),
        owner: 'footAssessment',
      })
      .toArray()
  },
  needleChatRoom: async (patient, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('needleChatRooms')
      .findOne({ _id: patient.needleChatRoomId })
  },
  closestAppointment: async (patient, _, { getDb }) => {
    const db = await getDb()
    const endOfToday = moment().endOf('day')._d
    const result = await db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
        appointmentTime: {
          $gt: endOfToday,
        },
      })
      .sort({ appointmentTime: 1 })
      .toArray()
    return result[0] || null
  },
  communications: async (patient, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('communication')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  caseRecords: async (patient, { limit = 0 }, { getDb }) => {
    const db = await getDb()
    return db
      .collection('caseRecord')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
  },
  soaps: async (patient, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('soap')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  outHospitalSoaps: async (patient, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('outHospitalSoap')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ createdAt: -1 })
      .toArray()
  },
  healthCareTeam: async (patient, _, { getDb }) => {
    const db = await getDb()
    if (patient.healthCareTeamId && patient.healthCareTeamId.length > 0) {
      return db
        .collection('healthCareTeams')
        .find({ _id: patient.healthCareTeamId[0] })
        .toArray()
    }
    return []
  },
  appointments: async (patient, _, { getDb }) => {
    const db = await getDb()
    return db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ appointmentTime: 1 })
      .toArray()
  },
  lastAppointment: async (patient, _, { getDb }) => {
    const db = await getDb()
    const result = await db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ appointmentTime: -1 })
      .toArray()
    return result[0] || null
  },
  lastCheckAppointment: async (patient, _, { getDb }) => {
    const db = await getDb()
    const result = await db
      .collection('appointments')
      .find({
        patientId: patient._id.toString(),
        isOutPatient: true,
        type: {
          $nin: ['addition'],
        },
      })
      .sort({ appointmentTime: -1 })
      .toArray()
    return result[0] || null
  },
  useIGluco: async (patient, _, { getDb }) => {
    const db = await getDb()
    const result = await db.collection('bloodGlucoses').findOne({
      patientId: patient._id.toString(),
      bloodGlucoseDataSource: 'IGLUCO_ICLUCO',
    })
    return !!result
  },
  useNeedle: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const bgDataFromNeedle = await db
      .collection('bloodGlucoses')
      .findOne({ patientId, bloodGlucoseDataSource: 'NEEDLE_BG1' })
    const anyBehaviors = await db
      .collection('userBehaviors')
      .findOne({ patientId })
    return !!(bgDataFromNeedle || anyBehaviors)
  },
  useSPT: async (patient, _, { getDb }) => {
    const db = await getDb()
    const result = await db.collection('bloodGlucoses').findOne({
      patientId: patient._id.toString(),
      bloodGlucoseDataSource: 'SPT_SPT',
    })
    return !!result
  },
  usePublicNumber: async (patient, _, { getDb }) => {
    const db = await getDb()
    const result = await db
      .collection('users')
      .find({
        _id: maybeCreateFromHexString(patient._id),
      })
      .toArray()
    return !!get(result[0], 'wechatTag')
  },
  lastHbAlc: async (patient, _, { getDb }) => {
    const db = await getDb()
    const result = await db
      .collection('clinicalLabResults')
      .find({
        patientId: patient._id.toString(),
      })
      .sort({ testDate: -1 })
      .toArray()
    if (result.length > 0) {
      return result[0].glycatedHemoglobin
    }
    return null
  },
  bloodGlucoses: async (patient, args, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const cursor = {
      patientId,
      dataStatus: 'ACTIVE',
    }
    if (args.startAt && args.endAt) {
      Object.assign(cursor, {
        measuredAt: {
          $gt: args.startAt,
          $lt: args.endAt,
        },
      })
    }
    const limit = args.limit || 0
    return await db
      .collection('bloodGlucoses')
      .find(cursor)
      .sort({ measuredAt: -1 })
      .limit(limit)
      .toArray()
  },
  bloodGlucosesByTime: async (patient, args, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const cursor = {
      patientId,
      dataStatus: 'ACTIVE',
    }
    if (args.selectTime) {
      Object.assign(cursor, { measuredAt: args.selectTime })
    }
    return await db
      .collection('bloodGlucoses')
      .find(cursor)
      .sort({ measuredAt: -1 })
      .toArray()
  },
  cdeInfo: async (patient, _, { getDb }) => {
    const db = await getDb()
    if (patient.cdeId) {
      const result = await db
        .collection('certifiedDiabetesEducators')
        .find({
          _id: patient.cdeId.toString(),
        })
        .toArray()
      return result[0] || null
    } else {
      return null
    }
  },
  doctorInfo: async (patient, _, { getDb }) => {
    const db = await getDb()
    if (patient.doctorId) {
      const result = await db
        .collection('users')
        .find({ _id: patient.doctorId })
        .toArray()
      return result[0] || null
    } else {
      return null
    }
  },
  MCR: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const bloodGlucoses = await db
      .collection('bloodGlucoses')
      .find({ patientId })
      .toArray()
    const module = await db
      .collection('measureModules')
      .find({ patientId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()

    if (isEmpty(bloodGlucoses) || isEmpty(module)) return 0
    const bgMeasureModule = await db
      .collection('bgMeasureModule')
      .findOne({ type: module[0].type })

    const { actualMeasure, notCompletedMeasure } = getMeasureFeedback({
      bloodGlucoses,
      patientId,
      bgMeasureModule,
    })
    const { pairing, count } = reduce(
      actualMeasure,
      (sum, m) => {
        return {
          pairing: sum.pairing + m.pairing,
          count: sum.count + m.count,
        }
      },
      {
        pairing: 0,
        count: 0,
      },
    )
    return Math.round((pairing * 100) / (pairing + count))
  },
  clinicalLabResults: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const results = await db
      .collection('clinicalLabResults')
      .find({
        patientId,
        glycatedHemoglobin: {
          $exists: 1,
        },
      })
      .sort({ testDate: -1 })
      .limit(3)
      .toArray()
    return results
  },
  yearServiceOrder: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const orders = await db
      .collection('orders')
      .find({
        patientId,
        orderStatus: 'SUCCESS',
        serviceEndAt: {
          $gte: new Date(),
        },
      })
      .sort({ serviceEndAt: -1 })
      .toArray()
    return orders.length ? orders[0] : null
  },
  yearServiceStatus: async (patient, { platform = 'android' }, { getDb }) => {
    const db = await getDb()
    const control = await db
      .collection('controls')
      .find({ platform, type: 'YEAR_SERVICE' })
      .toArray()
    return control.length ? control[0].status === 'ACTIVE' : false
  },
  achievements: async (patient, args, { getDb }) => {
    const db = await getDb()
    const achievements = await db
      .collection('achievements')
      .find({
        status: {
          $ne: 'INACTIVE',
        },
      })
      .sort({ createdAt: -1 })
      .toArray()
    return achievements
  },
  achievementRecords: async (patient, { achievementId }, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const cursor = {
      patientId,
    }
    if (achievementId) {
      cursor._id = achievementId
    }
    const achievements = await db
      .collection('achievementRecords')
      .find(cursor)
      .sort({ achieveAt: -1 })
      .toArray()
    return achievements
  },
  achievementResult: async (patient, { achievementId }, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const achievements = await db
      .collection('achievements')
      .find({
        status: {
          $ne: 'INACTIVE',
        },
      })
      .sort({ createdAt: -1 })
      .toArray()

    const cursor = {
      patientId,
    }
    if (achievementId) {
      cursor._id = achievementId
    }
    const achievementRecords = await db
      .collection('achievementRecords')
      .find(cursor)
      .sort({ achieveAt: -1 })
      .toArray()
    return { achievements, achievementRecords }
  },
  achievementShownRecords: async patient => {
    const patientId = patient._id.toString()
    const cursor = {
      patientId,
      isShown: false,
    }
    const achievements = await db
      .collection('achievementRecords')
      .find(cursor)
      .toArray()
    return achievements
  },
  bonusPoints: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const bonusPoints = await db
      .collection('bonusPoints')
      .find({
        patientId,
        expireAt: {
          $gt: new Date(),
        },
      })
      .sort({ createdAt: -1 })
      .toArray()
    return bonusPoints
  },
  avatar: async (patient, _, { getDb }) => {
    const isWechat = !isEmpty(patient.wechatInfo)
    const avatar = patient.avatar
      ? patient.avatar
      : isWechat
        ? patient.wechatInfo.headimgurl
          ? patient.wechatInfo.headimgurl.replace('http://', 'https://')
          : patient.gender === 'male'
            ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
            : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png'
        : patient.gender === 'male'
          ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
          : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png'
    return avatar
  },
  healthInformation: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    let hospital = '无照护组'
    if (patient.healthCareTeamId) {
      hospital = await db
        .collection('healthCareTeams')
        .findOne({ _id: patient.healthCareTeamId[0] })
    }
    const patientBriefInformation = {}
    patientBriefInformation.avatar = patient.avatar ? patient.avatar : 'empty'
    patientBriefInformation.nickname = patient.nickname
    patientBriefInformation.gender = patient.gender === 'male' ? '男' : '女'
    patientBriefInformation.age = moment(new Date()).diff(
      patient.dateOfBirth,
      'years',
    )
    patientBriefInformation.hospital = hospital.institutionName
    patientBriefInformation.doctor = patient.doctor ? patient.doctor : '--'
    patientBriefInformation.diabetesType = patient.diabetesType
      ? patient.diabetesType
      : '--'
    patientBriefInformation.courseOfDisease = patient.startOfIllness
      ? moment().get('year') - patient.startOfIllness.split('/')[0]
      : '--'
    return patientBriefInformation
  },
  selfTestSchemes: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const module = await db
      .collection('measureModules')
      .find({ patientId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()

    // console.log('module',module)
    if (isEmpty(module)) return null
    const bgMeasureModule = await db
      .collection('bgMeasureModule')
      .findOne({ type: module[0].type })

    // console.log('bgMeasureModule',bgMeasureModule)

    const selfTestSchemes = {}
    selfTestSchemes.startAt = module[0].startAt
    selfTestSchemes.endAt = module[0].endAt
    selfTestSchemes.type = module[0].type
    selfTestSchemes.bgMeasureModuleId = module[0].bgMeasureModuleId
    selfTestSchemes.schemeDetail = bgMeasureModule

    return selfTestSchemes
  },
  sugarControlGoals: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const caseRecord = await db
      .collection('caseRecord')
      .find({ patientId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()

    let sugarControlGoals = null
    if (caseRecord && caseRecord.length > 0) {
      sugarControlGoals = caseRecord[0]

      return sugarControlGoals
    }
  },
  predictionA1c: async patient => {
    const A1C_URL = 'http://172.31.48.12:50050/api/getPredictA1CByUserIDs'
    let a1c = ''
    try {
      const formData = {
        userId: patient._id,
      }
      axios.defaults.headers.post['Content-Type'] =
        'application/x-www-form-urlencoded'
      const result = await axios.post(A1C_URL, formData)
      a1c = get(result, 'data.result.prediction[0].a1cValue', null)
    } catch (e) {
      a1c = ''
    }
    if (a1c) {
      a1c = a1c.toFixed(1)
    }
    console.log(a1c)
    return a1c
  },

  availableAppointmentDates: async (patient, _, { getDb }) => {
    const db = await getDb()
    let result = []
    if (patient.healthCareTeamId && patient.healthCareTeamId.length > 0) {
      result = await db
        .collection('outpatients')
        .find({
          healthCareTeamId: patient.healthCareTeamId[0],
          state: 'WAITING',
          outpatientDate: {
            $gt: moment()
              .subtract(1, 'days')
              .endOf('day')._d,
          },
        })
        .sort({
          outpatientDate: 1,
        })
        .toArray()
    }
    return result
  },

  hospitalCde: (patient, _) => {
    let cdeInfo = {
      cdeName: '',
      cdeAvatar: '',
      hospitalCdeName: '',
      hospitalCdeAvatar: '',
    }
    if (patient.healthCareTeamId && patient.healthCareTeamId.length > 0) {
      const healthCareTeamId = patient.healthCareTeamId[0]
      switch (healthCareTeamId) {
        case 'healthCareTeam1':
          cdeInfo.cdeName = '齐晓静照护师'
          cdeInfo.cdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589116693.png'
          cdeInfo.hospitalCdeName = '刘红利照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1540878916517.png'
          break
        case 'healthCareTeam2':
          cdeInfo.cdeName = '马贝照护师'
          cdeInfo.cdeAvatar =
            'http://paper-king.ks3-cn-beijing.ksyun.com/workwechat1533719891829.png'
          cdeInfo.hospitalCdeName = '刘诗雯照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1540881599519.png'
          break
        case 'healthCareTeam3':
          cdeInfo.cdeName = '毛蓓照护师'
          cdeInfo.cdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589150797.png'
          cdeInfo.hospitalCdeName = '张昳涵照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1540880803450.png'
          break
        case 'healthCareTeam5':
          cdeInfo.cdeName = '户艳丽照护师'
          cdeInfo.cdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589073621.png'
          cdeInfo.hospitalCdeName = '张爱思照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1544076618242.png'
          break
        case 'healthCareTeam6':
          cdeInfo.cdeName = '周晓露照护师'
          cdeInfo.cdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589220936.png'
          cdeInfo.hospitalCdeName = '白丹丹照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1544076562020.png'
          break
        case 'healthCareTeam7':
          cdeInfo.cdeName = '周晓露照护师'
          cdeInfo.cdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589220936.png'
          cdeInfo.hospitalCdeName = '白丹丹照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1540881357489.png'
          break
        case 'healthCareTeam9':
          cdeInfo.cdeName = '刘红利照护师'
          cdeInfo.cdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1540878916517.png'
          cdeInfo.hospitalCdeName = '郑晓琳照护师'
          cdeInfo.hospitalCdeAvatar =
            'https://paper-king.ks3-cn-beijing.ksyun.com/workwechat1546586481761.png'
          break
        default:
          cdeInfo.cdeName = ''
          cdeInfo.cdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589220936.png'
          cdeInfo.hospitalCdeName = ''
          cdeInfo.hospitalCdeAvatar =
            'http://swift-snail.ks3-cn-beijing.ksyun.com/fafac6f1mKJFTaafa1530589116693.png'
      }
    }
    return cdeInfo
  },

  chatRoomInfos: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const chatRoom = await db
      .collection('needleChatRooms')
      .find({ 'participants.userId': patientId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()
    if (chatRoom && chatRoom.length > 0) {
      return chatRoom[0]
    }
    return null
  },

  BG1NotUseReason: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    let result = []
    if (patientId) {
      result = await db
        .collection('BG1NotUseReason')
        .find({ patientId })
        .sort({ createdAt: -1 })
        .toArray()
    }
    return result
  },

  nextAppointmentTime: async (patient, { appointmentTime }, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const endAt = moment(appointmentTime).endOf('day')._d
    let nextTime
    if (patientId) {
      const result = await db
        .collection('appointments')
        .find({
          patientId,
          appointmentTime: { $gt: endAt },
          isOutPatient: false,
        })
        .sort({ appointmentTime: 1 })
        .limit(1)
        .toArray()
      if (result && result.length > 0) {
        nextTime = result[0].appointmentTime
      }
    }
    return nextTime
  },

  lastSOAP: async (patient, { appointmentTime }, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    let result = []
    const soapItem = {}
    const start = moment(appointmentTime).startOf('days')._d
    const end = moment(appointmentTime).endOf('days')._d
    if (patientId) {
      result = await db
        .collection('soap')
        .find({
          patientId,
          appointmentTime: { $exists: true, $gte: start, $lte: end },
        })
        .sort({ createdAt: 1 })
        .toArray()
      if (result && result.length > 1) {
        const lastTwice = [result[0], result[1]]
        if (
          result[0].appointmentTime.getTime() ===
          result[1].appointmentTime.getTime()
        ) {
          const nurse = lastTwice.filter(
            item =>
              item.operator.roles === '护理师' ||
              item.operator.roles === '超级护理师',
          )
          const nutrition = lastTwice.filter(
            item =>
              item.operator.roles === '营养师' ||
              item.operator.roles === '超级护理师',
          )
          if (nurse.length && nurse[0].severity) {
            soapItem.severity = nurse[0].severity
            if (nutrition.length && nutrition[0].severity) {
              mapKeys(soapItem.severity, (value, key) => {
                if (
                  key === 'diet' &&
                  nutrition[0].severity.diet.value !== 'NOT_ASSESSMENT'
                ) {
                  soapItem.severity.diet = nutrition[0].severity.diet
                } else if (
                  key !== 'diet' &&
                  soapItem.severity[key].value === 'NOT_ASSESSMENT'
                ) {
                  soapItem.severity[key] = nutrition[0].severity[key]
                }
                return key
              })
            }
          } else if (nutrition.length && nutrition[0].severity) {
            soapItem.severity = nutrition[0].severity
          }
        } else if (result[0].severity) {
          soapItem.severity = result[0].severity
        }
      } else if (result.length === 1 && result[0].severity) {
        soapItem.severity = result[0].severity
      }
    }
    return soapItem
  },
  disease: async ({ outpatientExtra }, _, { getDb }) => {
    const db = await getDb()
    const ids = get(outpatientExtra, 'disease', [])
    return await db
      .collection('disease')
      .find({ _id: { $in: ids } })
      .toArray()
  },
  address: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    let result = []
    if (patientId) {
      result = await db
        .collection('address')
        .find({ patientId })
        .sort({ createdAt: -1 })
        .toArray()
    }
    return result
  },
  myArticle: async (patient, _, { getDb }) => {
    const knowledgeList = patient.knowledgeList
    let result = []
    if (knowledgeList && knowledgeList.length > 0) {
      result = await getBlogsByIdArray({ ids: knowledgeList })
    }
    return result
  },
  isShowAskDoctor: async (patient, _, { getDb }) => {
    const { createdAt, institutionId } = patient
    if (institutionId && institutionId === 'CHAOYANGYIYUAN') {
      var beforeThreeDays = moment().day(-2)
      if (beforeThreeDays > moment(createdAt)) {
        return false
      } else {
        return true
      }
    } else {
      return false
    }
  },
}
