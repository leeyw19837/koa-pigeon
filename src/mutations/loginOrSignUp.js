import { GraphQLError } from 'graphql/error'
import { verify } from 'righteous-raven'
import jsonwebtoken from 'jsonwebtoken'
import { isEmpty } from 'lodash'

import { generateJwt, createNewPatient } from '../utils'

const {
  RIGHTEOUS_RAVEN_URL,
  RIGHTEOUS_RAVEN_ID,
  RIGHTEOUS_RAVEN_KEY,
  JWT_SECRET,
  TOKEN_EXP,
  TOKEN_EXP_FOR_NEW,
} = process.env
export const updatePatientDemographics = async (_, args, context) => {
  const db = await context.getDb()
  const { mobile, birthday, height, weight, gender } = args
  await db.collection('users').update(
    {
      username: {
        $regex: mobile,
      },
    },
    {
      $set: {
        dateOfBirth: birthday,
        height,
        weight,
        gender,
        updatedAt: new Date(),
      },
    },
  )
  return true
}

export const loginOrSignUp = async (_, args, context) => {
  const db = await context.getDb()
  // const clientCodename = context.state.clientCodename
  const { mobile, verificationCode, wechatOpenId } = args
  var chinese = [
    "一",
    "乙",
    "二",
    "十",
    "丁",
    "厂",
    "七",
    "卜",
    "人",
    "入",
    "八",
    "九",
    "几",
    "力",
    "乃",
    "刀",
    "又",
    "于",
    "干",
    "亏",
    "士",
    "工",
    "土",
    "才",
    "寸",
    "大",
    "丈",
    "与",
    "万",
    "上",
    "小",
    "口",
    "巾",
    "山",
    "千",
    "川",
    "亿",
    "个",
    "勺",
    "久",
    "凡",
    "及",
    "夕",
    "丸",
    "么",
    "广",
    "亡",
    "门",
    "义",
    "之",
    "尸",
    "弓",
    "己",
    "已",
    "子",
    "卫",
    "也",
    "女",
    "飞",
    "刃",
    "习",
    "叉",
    "马",
    "乡",
    "丰",
    "王",
    "井",
    "开",
    "夫",
    "天",
    "无",
    "元",
    "专",
    "云",
    "扎",
    "艺",
    "木",
    "五",
    "支",
    "厅",
    "不",
    "太",
    "犬",
    "区",
    "历",
    "尤",
    "友",
    "匹",
    "车",
    "巨",
    "牙",
    "屯",
    "比",
    "互",
    "切",
    "瓦",
    "止",
    "少",
    "日",
    "中",
    "冈",
    "贝",
    "内",
    "水",
    "见",
    "午",
    "牛",
    "手",
    "毛",
    "气",
    "升",
    "长",
    "仁",
    "什",
    "片",
    "仆",
    "化",
    "仇",
    "币",
    "仍",
    "仅",
    "斤",
    "爪",
    "反",
    "介",
    "父",
    "从",
    "今",
    "凶",
    "分",
    "乏",
    "公",
    "仓",
    "月",
    "氏",
    "勿",
    "欠",
    "风",
    "丹",
    "匀",
    "乌",
    "凤",
    "勾",
    "文",
    "六",
    "方",
    "火",
    "为",
    "斗",
    "忆",
    "订",
    "计",
    "户",
    "认",
    "心",
    "尺",
    "引",
    "丑",
    "巴",
    "孔",
    "队",
    "办",
    "以",
    "允",
    "予",
    "劝",
    "双",
    "书",
    "幻",
    "玉",
    "刊",
    "示",
    "末",
    "未",
    "击",
    "打",
    "巧",
    "正",
    "扑",
    "扒",
    "功",
    "扔",
    "去",
    "甘",
    "世",
    "古",
    "节",
    "本",
    "术",
    "可",
    "丙",
    "左",
    "厉",
    "右",
    "石",
    "布",
    "龙",
    "平",
    "灭",
    "轧",
    "东",
    "卡",
    "北",
    "占",
    "业",
    "旧",
    "帅",
    "归",
    "且",
    "旦",
    "目",
    "叶",
    "甲",
    "申",
    "叮",
    "电",
    "号",
    "田",
    "由",
    "史",
    "只",
    "央",
    "兄",
    "叼",
    "叫",
    "另",
    "叨",
    "叹",
    "四",
    "生",
    "失",
    "禾",
    "丘",
    "付",
    "仗",
    "代",
    "仙",
    "们",
    "仪",
    "白",
    "仔",
    "他",
    "斥",
    "瓜",
    "乎",
    "丛",
    "令",
    "用",
    "甩",
    "印",
    "乐",
    "句",
    "匆",
    "册",
    "处",
    "冬",
    "鸟",
    "务",
    "包",
    "饥",
    "主",
    "市",
    "立",
    "闪",
    "兰",
    "半",
    "汁",
    "汇",
    "头",
    "汉",
    "宁",
    "它",
    "讨",
    "写",
    "让",
    "礼",
    "训",
    "必",
    "议",
    "讯",
    "记",
    "永",
    "司",
    "尼",
    "民",
    "出",
    "辽",
    "加",
    "召",
    "皮",
    "边",
    "发",
    "圣",
    "对",
    "台",
    "矛",
    "纠"
  ]
  var index = Math.floor((Math.random() * chinese.length))
  var indexq = Math.floor((Math.random() * chinese.length))
  var indexw = Math.floor((Math.random() * chinese.length))
  var indexe = Math.floor((Math.random() * chinese.length))
  var petname = chinese[index] + chinese[indexq] + chinese[indexw] + chinese[indexe]
  if (!/^1[3|4|5|7|8][0-9]\d{8}$/.test(mobile)) {
    throw new Error('手机号码格式不正确')
    return
  }
  if (verificationCode !== '0000') {
    const verificationResult = await verify(RIGHTEOUS_RAVEN_URL, {
      client_id: RIGHTEOUS_RAVEN_ID,
      client_key: RIGHTEOUS_RAVEN_KEY,
      rec: mobile,
      code: verificationCode,
    })
    // verificationCode !== '0000' for testing
    if (
      verificationResult.data.result !== 'success' &&
      verificationCode !== '0000'
    ) {
      throw new Error('验证码不正确')
    }
  }
  const existingPatient = await db.collection('users').findOne({
    username: {
      $regex: mobile,
    },
  })

  if (existingPatient) {
    if (!existingPatient.petname) {
      await db.collection('users').update(
        {
          _id: existingPatient._id,
        },
        {
          $set: {
            petname: petname
          },
        },
      )
    }
    if (wechatOpenId && !existingPatient.wechatOpenId) {
      // 把头像放这里
      const wechatInfo = await db
        .collection('wechats')
        .findOne({ openid: wechatOpenId })
      await db.collection('users').update(
        {
          _id: existingPatient._id,
        },
        {
          $set: {
            avatar: wechatInfo.headimgurl,
            wechatOpenId,
            updatedAt: new Date(),
            isUseNeedle: true,
          },
        },
      )
    } else {
      await db.collection('users').update(
        {
          _id: existingPatient._id,
        },
        {
          $set: {
            updatedAt: new Date(),
            isUseNeedle: true,
          },
        },
      )
    }
    let exp = TOKEN_EXP_FOR_NEW
    if (existingPatient.patientState === 'ACTIVE') {
      exp = TOKEN_EXP // 1 year
    } else if (existingPatient.patientState === 'BLACKLIST') {
      throw new Error('黑名单用户无登录权限！')
    }

    //JWT签名 console.log('准备为用户进行JWT签名：', existingPatient)
    const JWT = jsonwebtoken.sign(
      {
        user: existingPatient,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXP_FOR_NEW },
    )
    // console.log('JWT', JWT)
    const isWechat = !isEmpty(existingPatient.wechatInfo)
    return {
      patientId: existingPatient._id,
      didCreateNewPatient: false,
      avatar: existingPatient.avatar
        ? existingPatient.avatar
        : isWechat
          ? existingPatient.wechatInfo.headimgurl
            ? existingPatient.wechatInfo.headimgurl.replace(
              'http://',
              'https://',
            )
            : existingPatient.gender === 'male'
              ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
              : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png'
          : existingPatient.gender === 'male'
            ? 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-male@2x.png'
            : 'https://swift-snail.ks3-cn-beijing.ksyun.com/patient-female@2x.png',
      nickname: existingPatient.nickname,
      patientState: existingPatient.patientState,
      petname: existingPatient.petname,
      birthday: existingPatient.dateOfBirth,
      gender: existingPatient.gender,
      height: existingPatient.height,
      weight: existingPatient.weight,
      diabetesType: existingPatient.diabetesType,
      startOfIllness: existingPatient.startOfIllness,
      targetWeight: existingPatient.targetWeight,
      healthCareTeamId: existingPatient.healthCareTeamId
        ? existingPatient.healthCareTeamId[0]
        : '',
      mobile: existingPatient.username.replace('@ijk.com', ''),
      JWT,
      idCard: existingPatient.idCard,
    }
  }

  const patientInfo = {
    username: mobile,
    createdAt: new Date(),
    patientState: 'POTENTIAL',
    isUseNeedle: true,
    petname: petname,
    pinyinName: {
      full: '~',
      short: '~',
      initial: '~',
    },
  }
  if (wechatOpenId) {
    patientInfo.wechatOpenId = wechatOpenId
    const wechatInfo = await db
      .collection('wechats')
      .findOne({ openid: wechatOpenId })
    patientInfo.avatar = wechatInfo.headimgurl
  }

  const response = await db.collection('users').insertOne(patientInfo)
  const newPatient = response.ops[0]
  //JWT签名 console.log('准备为新用户进行JWT签名：', newPatient)
  const JWT = jsonwebtoken.sign(
    {
      user: newPatient,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXP_FOR_NEW },
  )

  // console.log('JWT', JWT)

  return {
    patientId: newPatient._id,
    didCreateNewPatient: true,
    patientState: newPatient.patientState,
    mobile: newPatient.username.replace('@ijk.com', ''),
    JWT,
    idCard: '',
    petname: petname,
  }
}
