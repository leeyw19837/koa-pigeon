import {face as AipFaceClient, HttpClient} from 'baidu-aip-sdk'
import {APP_ID, API_KEY, SECRET_KEY, FACE_RESPONSE_CODE, EmptyUserInfo} from "./ConstantValue";
import {ObjectID} from "mongodb";
import {getPinyinUsername, getUserInfoByIdCard, responseMessage} from "../util";
import {isEmpty} from "lodash";

const client = new AipFaceClient(APP_ID, API_KEY, SECRET_KEY);

HttpClient.setRequestInterceptor(function (requestOptions) {

  // 查看参数
  console.log(requestOptions)
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
    console.log('人脸检测结果', detectResult)
    const {error_code, error_msg} = detectResult
    if (error_code === 0 && error_msg === 'SUCCESS') {
      return true
    }
    return false
  } catch (e) {
    console.log(e)
    return false
  }


  //   .then(function (result) {
  //   console.log('人脸检测结果', result)
  //   const {error_code, error_msg} = result
  //   if (error_code === 0 && error_msg === 'SUCCESS') {
  //     return true
  //   }
  //   return false
  // }).catch(function (err) {
  //   console.log("人脸检测出错了", err)
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
  console.log('detectResult', detectResult)
  if (!detectResult) {
    return responseMessage(FACE_RESPONSE_CODE.error_detect_user_face_invalid, userInfo, "用户人脸检测失败，请重新录入")
  }
  const user = await db
    .collection('users')
    .findOne({
      username: phoneNumber
    });

  if (user) {
    // 数据库查到了该用户
    console.log(user)
    const patient = {userId: user._id, ...userInfo}
    return responseResult(base64Image, hospitalId, patient)
  } else {
    // 数据库没有查到该用户
    const pinyinName = getPinyinUsername(nickname);
    const _id = new ObjectID();
    // 插入新用户到数据库
    await db.collection('users').insert({
      _id,
      nickname,
      username: phoneNumber,
      createdAt: new Date(),
      idCard,
      pinyinName,
      ...getUserInfoByIdCard(idCard)
    })
    const patient = {userId:_id, ...userInfo}
    return responseResult(base64Image, hospitalId, patient)
  }

}

const responseResult = async (base64Image, hospitalId, userInfo) => {
  const addUserFaceResult = await addUserFace({base64Image, hospitalId, userInfo})
  console.log('addUserFaceResult', addUserFaceResult,userInfo)
  deleteUserFace(userInfo.userId, hospitalId)
  if (addUserFaceResult) {
    /*** 加入签到的逻辑*/

    return responseMessage(FACE_RESPONSE_CODE.success, userInfo, "用户录入并签到成功")
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

  // 调用人脸注册
  try {
    const addResult = await client.addUser(base64Image, imageType, hospitalId, userInfo.userId, options)
    if (addResult.result.face_token) {
      return true;
    }
    return false;
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
  console.log('detectResult', detectResult)
  if (!detectResult) {
    return responseMessage(FACE_RESPONSE_CODE.error_detect_user_face_invalid, EmptyUserInfo, "用户人脸检测失败，请重新录入")
  }

  const imageType = 'BASE64';

  // 调用人脸搜索
  try {
    const searchResult = await client.search(base64Image, imageType, hospitalId)
    console.log('人脸搜索结果', JSON.stringify(searchResult));

    const {error_code, result} = searchResult
    if (error_code === 0 && !isEmpty(result.user_list[0])) {
      const {
        group_id,
        user_info,
        score
      } = result.user_list[0];
      if (score > 90) {
        return responseResult(base64Image, group_id, JSON.parse(user_info))
      } else {
        return responseMessage(FACE_RESPONSE_CODE.error_search_user_found_not_match, JSON.parse(user_info), "用户查找到，但是比对评分过低")
      }
    } else {
      return responseMessage(FACE_RESPONSE_CODE.error_search_user_not_found, EmptyUserInfo, "用户未找到")
    }
  } catch (err) {
    console.log('人脸搜索出错', err);
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
    }, {nickname: 1, idCard: 1})
  if (user) {
    return user
  } else {
    return null
  }
}

/** 调用人脸库删除
 *  首先去查询人脸库里面对应的用户人脸列表，按照插入时间去排序，删掉最早的一条数据，然后插入新的人脸到人脸库中
 *  @params userId,groupId,
 * */

const deleteUserFace = async (userId, groupId) => {
  const options = {};
  const faceGetListResult = await client.faceGetlist(userId, groupId, options);
  console.log('获取用户下面的所有人脸', faceGetListResult);

  const array = faceGetListResult.result.face_list

  console.log("faceGetListResult.result.face_list.array[0]= ", JSON.stringify(array))

  // 按照人脸添加时间排序并删除最早的人脸
  //const faceDeleteResult = await client.faceDelete()
}


