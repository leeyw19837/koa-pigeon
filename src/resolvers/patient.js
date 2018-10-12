import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import reduce from 'lodash/reduce'
import { maybeCreateFromHexString } from '../utils/maybeCreateFromHexString'
import moment from 'moment'
import axios from 'axios'
import { getMeasureFeedback } from '../cronJob/controller/getMeasureFeedback'

const getCondition = ({ filter }) => {
  const { namePattern, cdeId } = filter
  const condition = {
    patientState: { $nin: ['REMOVED'] },
    cdeId: { $exists: 1 },
    roles: { $exists: 0 },
  }
  if (namePattern) {
    condition.nickname = { $regex: namePattern }
  }

  if (cdeId) condition.cdeId = cdeId
  return condition
}
export const PatientPagination = {
  total: async (pp, _, { getDb }) => {
    const db = await getDb()
    const condition = getCondition(pp)

    return await db.collection('users').count(condition)
  },
  patients: async (pp, _, { getDb }) => {
    const db = await getDb()
    const condition = getCondition(pp)
    const { startIndex, stopIndex } = pp.slice
    return await db
      .collection('users')
      .find(condition)
      .sort({ 'pinyinName.initial': 1, 'pinyinName.short': 1 })
      .skip(startIndex)
      .limit(stopIndex - startIndex + 1)
      .toArray()
  },
  catalog: async (pp, _, { getDb }) => {
    const db = await getDb()
    const condition = getCondition(pp)
    const data = await db
      .collection('users')
      .aggregate([
        { $match: condition },
        { $group: { _id: '$pinyinName.initial', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray()
    return data.reduce(
      ({ index, result }, curr) => {
        const newResult = [...result, { letter: curr._id.toUpperCase(), index }]
        const nextIndex = index + curr.count
        return {
          index: nextIndex,
          result: newResult,
        }
      },
      { index: 0, result: [] },
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
    return db.collection('needleChatRooms').findOne({
      _id: patient.needleChatRoomId,
    })
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
        .find({
          _id: patient.healthCareTeamId[0],
        })
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
        type: { $nin: ['addition'] },
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
    const bgDataFromNeedle = await db.collection('bloodGlucoses').findOne({
      patientId,
      bloodGlucoseDataSource: 'NEEDLE_BG1',
    })
    const anyBehaviors = await db.collection('userBehaviors').findOne({
      patientId,
    })
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
        measuredAt: { $gt: args.startAt, $lt: args.endAt },
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
      Object.assign(cursor, {
        measuredAt: args.selectTime,
      })
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
        .find({
          _id: patient.doctorId,
        })
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
      { pairing: 0, count: 0 },
    )
    return Math.round((pairing * 100) / (pairing + count))
  },
  clinicalLabResults: async (patient, _, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const results = await db
      .collection('clinicalLabResults')
      .find({ patientId, glycatedHemoglobin: { $exists: 1 } })
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
      .sort({
        serviceEndAt: -1,
      })
      .toArray()
    return orders.length ? orders[0] : null
  },
  yearServiceStatus: async (patient, { platform = 'android' }, { getDb }) => {
    const db = await getDb()
    const control = await db
      .collection('controls')
      .find({
        platform,
        type: 'YEAR_SERVICE',
      })
      .toArray()
    return control.length ? control[0].status === 'ACTIVE' : false
  },
  achievements: async (patient, args, { getDb }) => {
    const db = await getDb()
    const achievements = await db
      .collection('achievements')
      .find({
        status: { $ne: 'INACTIVE' },
      })
      .sort({
        createdAt: -1,
      })
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
      .sort({
        achieveAt: -1,
      })
      .toArray()
    return achievements
  },
  achievementResult: async (patient, { achievementId }, { getDb }) => {
    const db = await getDb()
    const patientId = patient._id.toString()
    const achievements = await db
      .collection('achievements')
      .find({
        status: { $ne: 'INACTIVE' },
      })
      .sort({
        createdAt: -1,
      })
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
      .sort({
        achieveAt: -1,
      })
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
      .sort({
        createdAt: -1,
      })
      .toArray()
    return bonusPoints
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
}
