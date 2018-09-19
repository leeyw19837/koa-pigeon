import {ObjectID} from 'mongodb'
import moment from 'moment'

export const confirmContent = [
  /\.*好的\.*/,
  /\.*谢谢\.*/,
  /\.*收到\.*/,
  /\.*明白\.*/,
  /\.*知道\.*/,
  /\.*OK\.*/,
  /\.*ok\.*/,
  /\.*Got\.*/,
  /\.*got\.*/,
  /\.*Copy\.*/,
  /\.*copy\.*/
];

export const getAllCdes = async() => {
  const cdes = await db
    .collection('certifiedDiabetesEducators')
    .find({
      patientPercent: {
        $exists: true
      }
    })
    .toArray()
  return cdes
}

export const getCdeDutys = async() => {
  const cdedutys = await db
    .collection('cdeDutys')
    .find({state: true})
    .toArray()
  return cdedutys
}

export const updateCdeDutys = async(_id, newCdes) => {
  await db
    .collection('cdeDutys')
    .update({
      _id
    }, {
      $set: {
        cdes: newCdes
      }
    })
  return true
}

export const insertCdeDutys = async(cdes) => {
  await db
    .collection('cdeDutys')
    .insert({
      _id: new ObjectID().toHexString(),
      state: true,
      dutyPeopleperDay: 1,
      cdes
    })
  return true
}

export const saveHistory = async(cde) => {
  await db
    .collection('cdeDutyHistories')
    .insert({
      name: cde.nickname,
      mobile: cde.phoneNumber,
      datetime: moment()
        .add(1, 'd')
        .format('YYYY-MM-DD'),
      date: moment()
        .add(1, 'd')
        .format('MM月DD日'),
      confirmed: false,
      sendVerifyConfirm: false,
      createdAt: new Date()
    })
}

export const getHistories = async(date = new moment()) => {
  const result = await db
    .collection('cdeDutyHistories')
    .find({
      createdAt: {
        $lte: date
          .endOf('day')
          .toDate(),
        $gte: date
          .startOf('day')
          .toDate()
      }
    })
    .toArray();
  return result;
}

export const isReply = async(mobile) => {
  let result = await ravenDb
    .collection('receives')
    .find({
      phone: mobile,
      sendTime: {
        $lte: moment()
          .endOf('day')
          .toDate(),
        $gte: moment()
          .startOf('day')
          .toDate()
      },
      content: {
        $in: confirmContent
      }
    })
    .toArray();;
  console.log(result);

  return result && result.length > 0;
}

export const updateHistrty = async(history) => {
  const id = history._id;
  delete history._id;
  return await db
    .collection('cdeDutyHistories')
    .updateOne({
      _id: id
    }, {$set: history});
}