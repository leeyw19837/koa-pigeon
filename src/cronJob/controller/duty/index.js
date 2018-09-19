import moment from 'moment'
import {ObjectID} from 'mongodb'
import {get, omit, last, difference, pullAt} from 'lodash'
import {sendTxt} from '../../../common'

const getAllCdes = async() => {
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

const isHoliday = async() => {
  // 2018年节假日
  const jrdate_2018 = [
    moment('2018-01-01').startOf('day'),
    moment('2018-02-15').startOf('day'),
    moment('2018-02-16').startOf('day'),
    moment('2018-02-17').startOf('day'),
    moment('2018-02-18').startOf('day'),
    moment('2018-02-19').startOf('day'),
    moment('2018-02-20').startOf('day'),
    moment('2018-02-21').startOf('day'),
    moment('2018-06-18').startOf('day'),
    moment('2018-09-24').startOf('day'),
    moment('2018-10-01').startOf('day'),
    moment('2018-10-02').startOf('day'),
    moment('2018-10-03').startOf('day'),
    moment('2018-10-04').startOf('day'),
    moment('2018-10-05').startOf('day')
  ]
  // 2018年调休日
  const txr_2018 = [
    moment('2018-02-11').startOf('day'),
    moment('2018-02-24').startOf('day'),
    moment('2018-04-08').startOf('day'),
    moment('2018-04-28').startOf('day'),
    moment('2018-09-29').startOf('day'),
    moment('2018-09-30').startOf('day')
  ]

  if (jrdate_2018.indexOf(moment().add(1, 'd').startOf('day')) > -1 || (txr_2018.indexOf(moment().add(1, 'd').startOf('day')) < 0 && (dayOfWeek === 0 || dayOfWeek === 6))) {
    return true
  } else {
    return false
  }

}

const checkDutyCde = async(cdes) => {
  let dutyCdes = [];
  for (const key in cdes) {
    if (cdes.hasOwnProperty(key)) {
      let cde = cdes[key];
      cde = omit(cde, ['patientPercent', '__v'])
      if (cde.stopPeriod) {
        const periodSpliter = cde
          .stopPeriod
          .split('--');
        const startTime = moment(periodSpliter[0]).startOf('day');
        const endTime = periodSpliter[1] === '无限'
          ? moment('2999-12-31').endOf('day')
          : moment(periodSpliter[1]).endOf('day');
        console.log(periodSpliter, startTime, endTime)
        if (moment().add(1, 'd').isBefore(startTime)) {
          dutyCdes.push(cde);
          console.log('isBefore', startTime, cde);
        }
        if (moment().add(1, 'd').isAfter(endTime)) {
          dutyCdes.push(cde);
          console.log('isAfter', endTime, cde);
          // Todo 删除 Period
        }
      } else {
        dutyCdes.push(cde);
        console.log('else', cde);
      }
    }
  }
  return dutyCdes;
}

const generateNewDutyQueue = async(currentDutyCdes, todayDutyCdes) => {
  console.log('当前值班数组——>', currentDutyCdes)
  console.log('今天值班数组——>', todayDutyCdes)
  let currentDutyIds = [];
  let todayDutyIds = [];
  currentDutyCdes.forEach(e => {
    currentDutyIds.push(e._id);
  });
  todayDutyCdes.forEach(e => {
    todayDutyIds.push(e._id);
  });
  let delArr = difference(currentDutyIds, todayDutyIds);
  console.log('要删除的照护师ID：——>', delArr);
  let addArr = difference(todayDutyIds, currentDutyIds);
  // 取seq
  console.log('要增加的照护师ID：——>', addArr);
  let seq = 1;
  if (currentDutyCdes.length) {
    seq = currentDutyCdes[0].seq;
  }
  console.log('当前seq', seq);
  // 新Arr
  let newArr = [];
  for (const key in currentDutyCdes) {
    if (currentDutyCdes.hasOwnProperty(key)) {
      const e = currentDutyCdes[key];
      if (delArr.indexOf(e._id) < 0) {
        newArr.push(e)
      }
    }
  }
  for (const key in addArr) {
    if (addArr.hasOwnProperty(key)) {
      const e = addArr[key];
      newArr.push(todayDutyCdes.filter(o => o._id === e)[0])
    }
  }
  // 重新排序
  for (const key in newArr) {
    if (newArr.hasOwnProperty(key)) {
      const e = newArr[key];
      e.seq = Number(seq) + Number(key)
    }
  }
  console.log('重组后的新数组——>', newArr);
  return newArr
}

export const saveDutyQueue = async() => {
  // 查询所有照护师
  const cdes = await getAllCdes();
  const todayDutyCdes = await checkDutyCde(cdes);
  const cdedutys = await db
    .collection('cdeDutys')
    .find({state: true})
    .toArray()
  let _id = new ObjectID().toHexString();
  if (cdedutys.length) {
    _id = cdedutys[0]._id;
    // 取现有照护师数组
    const currentCdes = cdedutys[0].cdes
    const newCdes = await generateNewDutyQueue(currentCdes, todayDutyCdes);
    // 更新照护师值班
    await db
      .collection('cdeDutys')
      .update({
        _id
      }, {
        $set: {
          cdes: newCdes
        }
      })
    return JSON.stringify(newCdes);
  } else {
    // 插入排队序列
    for (const key in todayDutyCdes) {
      if (todayDutyCdes.hasOwnProperty(key)) {
        const dutyCde = todayDutyCdes[key];
        dutyCde.seq = Number(key) + 1;
      }
    }
    // 插入值班照护师数组，每日值班人数默认为1
    await db
      .collection('cdeDutys')
      .insert({_id, state: true, dutyPeopleperDay: 1, cdes: todayDutyCdes})
    return JSON.stringify(todayDutyCdes);
  }
}

export const getNextDutyCdes = async() => {
  const duty = await db
    .collection('cdeDutys')
    .findOne({state: true})
  const dutyPeopleperDay = duty.dutyPeopleperDay;
  const cdes = duty.cdes;
  const _id = duty._id;
  let pulledCdes = []
  if (cdes.length) {
    console.log('取出的照护师队列👉 ', cdes);
    let lastSeq = last(cdes).seq;
    let pullIndex = [];
    for (let i = 0; i < dutyPeopleperDay; i++) {
      pullIndex.push(i);
    }
    pulledCdes = pullAt(cdes, pullIndex);
    console.log('将要发短信的照护师们👉 ', pulledCdes);
    //重组数据
    for (const key in pulledCdes) {
      if (pulledCdes.hasOwnProperty(key)) {
        const element = pulledCdes[key];
        element.seq = Number(lastSeq) + Number(key) + 1;
        cdes.push(element);
      }
    }
    console.log('重组后的照护师队列👉 ', cdes);
    await db
      .collection('cdeDutys')
      .update({
        _id
      }, {$set: {
          cdes
        }})
  }
  return pulledCdes
}

export const sendDutyMessage = async() => {
  await saveDutyQueue();
  const cdes = await getNextDutyCdes();
  for (const key in cdes) {
    if (cdes.hasOwnProperty(key)) {
      const cde = cdes[key];
      const option = {
        mobile: cde.phoneNumber,
        templateId: 'SMS_145501348',
        params: {
          adjective: '可爱',
          name: cde.nickname,
          date: moment()
            .add(1, 'd')
            .format('YYYY年MM月DD日')
        }
      }
      await sendTxt(option)
    }
  }
  return 'OK'
}