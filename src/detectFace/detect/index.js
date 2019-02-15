import {face as AipFaceClient, HttpClient} from 'baidu-aip-sdk'
import {APP_ID, API_KEY, SECRET_KEY} from "./ConstantValue";
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

  client.detect(base64Image, imageType, options).then(function (result) {
    console.log('人脸检测结果', result)

    return result
  }).catch(function (err) {
    console.log("人脸检测出错了", err)
    return err
  })

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
  const detectResult = detect(base64Image);
  return detectResult

  const {phoneNumber, nickname, idCard = ""} = userInfo
  const user = await db
    .collection('users')
    .findOne({
      username: phoneNumber
    });

  if (user) {
    // 数据库查到了该用户
    console.log(user)
    const patient = {userId: user._id, ...userInfo}
    if (addUserFace({base64Image, hospitalId, patient})) {
      /*** 加入签到的逻辑*/


      return responseMessage(true, patient, "用户录入并签到成功")
    } else {
      return responseMessage(false, patient, "用户录入并签到失败")
    }
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
    const patient = {_id, ...userInfo}
    if (addUserFace({base64Image, hospitalId, patient})) {
      /*** 加入签到的逻辑*/


      return responseMessage(true, patient, "用户录入并签到成功")
    } else {
      return responseMessage(false, patient, "用户录入并签到失败")
    }

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
  client.addUser(base64Image, imageType, hospitalId, userInfo.userId, options).then(function (result) {
    console.log("人脸注册到人脸库中", JSON.stringify(result));
    if (result.face_token) {
      return true;
    }
    return false;
  }).catch(function (err) {
    // 如果发生网络错误
    console.log("人脸注册到人脸库中", err);
    return false;
  });

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
  const imageType = 'BASE64';
  // 调用人脸搜索
  client.search(base64Image, imageType, hospitalId).then(function (result) {
    console.log('人脸搜索结果', JSON.stringify(result));

    if (!isEmpty(result.user_list[0])) {
      const {
        group_id,
        user_info,
        score
      } = result.user_list[0];
      if (score > 80) {
        addUserFace({base64Image, group_id, userInfo: user_info})
        return responseMessage(true, user_info, "用户录入并签到成功")
      } else {
        return responseMessage(false, user_info, "用户录入并签到失败")
      }
    }

  }).catch(function (err) {
    // 如果发生网络错误
    console.log('人脸搜索出错', err);
    return responseMessage(false, {}, err)
  });
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




