import {face as AipFaceClient, HttpClient} from 'baidu-aip-sdk'
import {API_KEY, APP_ID, EmptyUserInfo, FACE_RESPONSE_CODE, SECRET_KEY} from "./ConstantValue";
import {ObjectId, ObjectID} from "mongodb";
import {getPinyinUsername, getUserInfoByIdCard, responseMessage} from "../util";
import {isEmpty, sortBy} from "lodash";
import {uploadBase64Img} from "../../utils";
import {MessageMap, outpatientPlanCheckIn} from "../../mutations/outpatientPlan";

const client = new AipFaceClient(APP_ID, API_KEY, SECRET_KEY);

HttpClient.setRequestInterceptor(function (requestOptions) {

  // 查看参数
  // console.log(requestOptions)
  // 修改参数
  requestOptions.timeout = 5000;
  // 返回参数
  return requestOptions;

})

/**检测图片中的人脸并标记处位置信息*/
const detect = async (base64Image) => {
  const imageType = 'BASE64';

  // 可选参数配置 options 包括 ：
  // face_field：面部特征
  // max_face_num ：最大人脸数量
  // face_type 人脸类型

  const options = {};

  try {
    const detectResult = await client.detect(base64Image, imageType, options)
    // console.log('人脸检测结果', detectResult)
    const {error_code, error_msg} = detectResult
    if (error_code === 0 && error_msg === 'SUCCESS') {
      return true
    }
    return false
  } catch (e) {
    // console.log(e)
    return false
  }


  //   .then(function (result) {
  //   // console.log('人脸检测结果', result)
  //   const {error_code, error_msg} = result
  //   if (error_code === 0 && error_msg === 'SUCCESS') {
  //     return true
  //   }
  //   return false
  // }).catch(function (err) {
  //   // console.log("人脸检测出错了", err)
  //   return false
  // })
}


/** 用户人脸库录入
 *  @params:
 * 1. base64Image,
 * 2. hospitalId,
 * 3. userInfo :{phoneNumber!, nickname!, idCard, ...}
 *
 * 根据上传上来的图片进行人脸检测，查看是否符合人脸识别的标准，如果符合标准则进行人脸库的录入
 * 从数据库里面找一下是不是有这个用户
 * 有这个用户 则直接执行添加到人脸库并且签到成功
 * 如果数据库没有该用户 则在数据库中添加这个用户，标注该用户来源createBy: 'detectFace' 然后添加该用户到人脸库中，同时签到成功
 * 签到成功之后pub消息到web
 *
 * */

export const addUser = async (ctx) => {
  const {base64Image, hospitalId, userInfo} = ctx.request.body
  const detectResult = await detect(base64Image);
  const {phoneNumber, nickname, idCard = ""} = userInfo
  // console.log('detectResult', detectResult)
  if (!detectResult) {
    return responseMessage(FACE_RESPONSE_CODE.error_detect_user_face_invalid, userInfo, "用户人脸检测失败，请重新录入")
  }
  const pinyinName = getPinyinUsername(nickname);
  const user = await db
    .collection('users')
    .findOne({
      username: phoneNumber
    });

  if (user) {
    // 数据库查到了该用户
    const patient = {userId: user._id, ...userInfo}
    const imageUrl = await getImageUrlFromKs3(user._id.valueOf().toString(), base64Image)
    db.collection('users').update(
      {_id: user._id},
      {
        $set: {
          authenticAvatar: imageUrl,
          username: phoneNumber,
          nickname,
          idCard,
          pinyinName,
          updatedAt: new Date(),
          institutionId: hospitalId,
          ...getUserInfoByIdCard(idCard)
        }
      },
    )

    return responseResult(base64Image, hospitalId, patient, imageUrl)
  } else {
    // 数据库没有查到该用户

    const _id = new ObjectID();
    const patient = {userId: _id, ...userInfo}
    // 插入新用户到数据库
    const imageUrl = await getImageUrlFromKs3(_id.valueOf().toString(), base64Image)
    db.collection('users').insert({
      _id,
      nickname,
      username: phoneNumber,
      createdAt: new Date(),
      idCard,
      pinyinName,
      authenticAvatar: imageUrl,
      institutionId: hospitalId,
      ...getUserInfoByIdCard(idCard),
      createdBy: 'FACE_DOG'
    })

    return responseResult(base64Image, hospitalId, patient, imageUrl)
  }

}

const responseResult = async (base64Image, hospitalId, userInfo, imageUrl = "") => {
  const addUserFaceResult = await addUserFace({base64Image, hospitalId, userInfo})
  let userFaceImageUrl = imageUrl;
  if (!userFaceImageUrl) {
    userFaceImageUrl = await getImageUrlFromKs3(userInfo.userId, base64Image)
    const {userId, phoneNumber, nickname, idCard} = userInfo
    const pinyinName = getPinyinUsername(nickname)
    db.collection('users').update(
      {_id: ObjectId.createFromHexString(userId)},
      {
        $set: {
          authenticAvatar: userFaceImageUrl,
          username: phoneNumber,
          nickname,
          idCard,
          pinyinName,
          updatedAt: new Date(),
          institutionId: hospitalId,
          ...getUserInfoByIdCard(idCard)
        }
      },
    )
  }
  updateLocalFaceStorage(hospitalId, userFaceImageUrl, userInfo)

  // console.log('addUserFaceResult', addUserFaceResult, userInfo)
  if (addUserFaceResult) {
    /*** 加入签到的逻辑*/
    const result = await checkInResult({patientId:userInfo.userId, hospitalId})
    // console.log('==result==', result)
    const {
      code,
      type,
      message
    } = result
    let resultStatus = FACE_RESPONSE_CODE.error_check_in_other_reasons
    let resultMessage = message.text
    switch (code) {
      case 'ALREADY_SIGNED':
        resultStatus = FACE_RESPONSE_CODE.error_check_in_already_signed
       break

      case 'PLANID_NOT_FOUND':
      case 'NO_PLAN_FOR_DEPARTMENT':
      case 'NO_PARAMS':

      // 不是共同照护门诊患者（理论不应返回，直接走签到的流程）
      case 'NOT_PLAN_PATIENT':
        resultStatus = FACE_RESPONSE_CODE.error_check_in_need_contact_cde
        break

      // 是共同照护门诊的患者，但是不该今天来。返回前端，让患者选择是参与共同照护门诊还是普通门诊
      case 'ONLY_CHECKIN_AT_THAT_DAY':
        resultStatus = FACE_RESPONSE_CODE.error_check_in_should_check_certain_day
        break

      case 'CHECKIN':
        resultStatus = FACE_RESPONSE_CODE.success
        break

      default:
        resultStatus = FACE_RESPONSE_CODE.error_check_in_other_reasons
        break
    }
    return responseMessage(resultStatus, userInfo, resultMessage)
  } else {
    return responseMessage(FACE_RESPONSE_CODE.error_add_user_other_errors, userInfo, "用户录入并签到失败")
  }
}

/*** 人脸注册到人脸库中
 *
 * @params:
 * 1. base64Image,
 * 2. hospitalId,
 * 3. userInfo :{userId! ...}
 * */
const addUserFace = async ({base64Image, hospitalId, userInfo}) => {

  const imageType = "BASE64";
  // 如果有可选参数
  const options = {};
  options["user_info"] = `${JSON.stringify(userInfo)}`;
  // options["quality_control"] = "NORMAL";
  // options["liveness_control"] = "LOW";
  await deleteAndAddNewUserFace(userInfo.userId, hospitalId)

  // 调用人脸注册
  try {
    const addResult = await client.addUser(base64Image, imageType, hospitalId, userInfo.userId, options)
    // console.log('人脸注册添加结果', addResult)
    return true;
  } catch (e) {
    return false
  }
}

/**
 * 人脸搜索 根据上传的图片去人脸库中查找是否存在
 * @params:
 * 1. base64Image
 * 2. hospitalId,
 *
 * @return
 *
 * 如果搜索到结果score得分>80的，则认为是同一人，同时把该张脸存入到对应的用户下面
 * 如果搜索到的结果score得分小于80，则表示搜索到的不是同一个人，提示用户注册人脸到人脸库
 *
 */

export const searchFace = async (ctx) => {
  const {base64Image, hospitalId} = ctx.request.body
  const detectResult = await detect(base64Image);
  // console.log('detectResult', detectResult)
  if (!detectResult) {
    return responseMessage(FACE_RESPONSE_CODE.error_detect_user_face_invalid, EmptyUserInfo, "用户人脸检测失败，请重新录入")
  }

  const imageType = 'BASE64';

  // 调用人脸搜索
  try {
    const searchResult = await client.search(base64Image, imageType, hospitalId)
    // console.log('人脸搜索结果', JSON.stringify(searchResult));

    const {error_code, result} = searchResult
    if (error_code === 0 && !isEmpty(result.user_list[0])) {
      const {
        group_id,
        user_info,
        score
      } = result.user_list[0];
      if (score > 90) {
        return responseResult(base64Image, group_id, JSON.parse(user_info),)
      } else {
        return responseMessage(FACE_RESPONSE_CODE.error_search_user_found_not_match, JSON.parse(user_info), "用户查找到，但是比对评分过低")
      }
    } else {
      return responseMessage(FACE_RESPONSE_CODE.error_search_user_not_found, EmptyUserInfo, "用户未找到")
    }
  } catch (err) {
    // console.log('人脸搜索出错', err);
    return responseMessage(FACE_RESPONSE_CODE.error_search_other_errors, EmptyUserInfo, err)
  }
}

/** 根据手机号查询用户*/
export const searchUserByPhoneNumber = async (ctx) => {
  const {phoneNumber} = ctx.request.body
  const user = await db
    .collection('users')
    .findOne({
      username: phoneNumber
    }, {nickname: 1, idCard: 1, username: 1})
  if (user) {
    const formattedUser = {
      userId: user._id.valueOf().toString(),
      phoneNumber: user.username,
      nickname: user.nickname || null,
      idCard: user.idCard || null
    }
    return responseMessage(FACE_RESPONSE_CODE.success, formattedUser, "手机号校验：查到该用户！")
  } else {
    return responseMessage(FACE_RESPONSE_CODE.error_add_user_user_not_exist, EmptyUserInfo, "手机号校验：未查到该用户！")
  }
}

/** 调用人脸库删除
 *  首先去查询人脸库里面对应的用户人脸列表，按照插入时间去排序，删掉最早的一条数据，然后插入新的人脸到人脸库中
 *  @params userId,groupId,
 * */

const deleteAndAddNewUserFace = async (userId, groupId) => {
  // console.log(userId, groupId, 'userId', 'groupId')
  const options = {};
  try {
    const faceGetListResult = await client.faceGetlist(userId, groupId, options);
    const {error_code, result} = faceGetListResult
    if (error_code === 0 && result.face_list.length >= 20) {
      const earliestFace = sortBy(result.face_list, (o) => o.ctime)
      const deleteOptions = {}
      const faceDeleteResult = await client.faceDelete(userId, groupId, earliestFace[0].face_token, deleteOptions)
      // console.log('人脸删除结果', faceDeleteResult)
      return true
    } else {
      // console.log('获取当前用户的人脸库数据失败', error_code)
      return false
    }
  } catch (e) {
    // console.log('获取当前用户的人脸库数据失败', e)
    return true
  }

}


const getImageUrlFromKs3 = async (patientId, base64Image) => {
  const imageUrlKey = `${patientId}${Date.now()}`
  const imageUrl = await uploadBase64Img(imageUrlKey, base64Image)
  return imageUrl;
}

// 把用户的人脸图片保存到公司的服务器中
const updateLocalFaceStorage = async (groupID, faceUrl, userInfo) => {
  const userFaceDatabase = await db
    .collection('faceDatabase')
    .findOne({
      userId: userInfo.userId,
      groupID,
    });

  const nowDate = new Date()
  const faceSourceItem = {
    faceToken: new ObjectID().valueOf().toString(),
    faceUrl,
    faceImageType: 'URL',
    updatedAt: nowDate
  }
  if (userFaceDatabase) {
    db.collection('faceDatabase').update(
      {_id: userFaceDatabase._id},
      {
        $set: {
          userInfo,
          updatedAt: nowDate,
          faceSource: [...userFaceDatabase.faceSource, faceSourceItem]
        }
      },
    )
  } else {
    db.collection('faceDatabase').insert({
      _id: new ObjectID().valueOf().toString(),
      userId: userInfo.userId,
      groupID,
      userInfo,
      createdAt: nowDate,
      faceSource: [faceSourceItem]
    })
  }
}

/**
 * 获取医院的列表信息
 * */
export const getHospitals = async () => {
  const hospitalList = await db
    .collection('institutions')
    .find({}).toArray();
  const responseData = hospitalList.map((item) => {
    const {_id, code, name, fullname, logoImg} = item
    return {
      hospitalId: _id,
      hospitalCode: code,
      name: name,
      fullname,
      logoImg
    }
  })
  return responseMessage(FACE_RESPONSE_CODE.success, responseData, "获取到医院的列表信息")
}

// 获取签到结果
export const checkInResult = async ({patientId, hospitalId}) => {
  const checkInResult = await outpatientPlanCheckIn(null, {
    patientId,
    hospitalId,
    departmentId: 'neifenmi'
  }, {getDb: () => db})
  // console.log("checkInResult",checkInResult)
  return checkInResult
}
