import moment from 'moment'
import {ObjectID} from 'mongodb'
import {get, omit, last, difference, pullAt} from 'lodash'
import {sendTxt} from '../../../common'
import {
  getAllCdes,
  getCdeDutys,
  updateCdeDutys,
  insertCdeDutys,
  saveHistory,
  getHistories,
  isReply,
  updateHistrty,
  getAdjectives
} from '../../services/duty'

let {HOLIDAY_SEND, LEADER_MOBILE1, LEADER_MOBILE2} = process.env

const isHoliday = () => {
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
  const dayOfWeek = moment()
    .add(1, 'd')
    .dayOfWeek;
  if (jrdate_2018.indexOf(moment().add(1, 'd').startOf('day')) > -1 || (txr_2018.indexOf(moment().add(1, 'd').startOf('day')) < 0 && (dayOfWeek === 0 || dayOfWeek === 6))) {
    console.log('------------------------ is holiday ------------------------');
    return true
  } else {
    console.log('------------------------ is not holiday ------------------------');
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
  const cdedutys = await getCdeDutys()
  let _id = new ObjectID().toHexString();
  if (cdedutys.length) {
    _id = cdedutys[0]._id;
    // 取现有照护师数组
    const currentCdes = cdedutys[0].cdes
    const newCdes = await generateNewDutyQueue(currentCdes, todayDutyCdes);
    // 更新照护师值班
    await updateCdeDutys(_id, newCdes);
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
    await insertCdeDutys(todayDutyCdes)
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
    await updateCdeDutys(_id, cdes);
  }
  return pulledCdes
}

export const sendDutyMessage = async() => {
  if (HOLIDAY_SEND === 'true' && !isHoliday()) {
    return;
  }

  await saveDutyQueue();
  const cdes = await getNextDutyCdes();
  // 初始化形容词
  const adjs = await getAdjectives();
  for (const key in cdes) {
    if (cdes.hasOwnProperty(key)) {
      const cde = cdes[key];
      const option = {
        mobile: cde.phoneNumber,
        templateId: 'SMS_145501348',
        params: {
          adjective: adjs.randomElement(),
          name: cde.nickname,
          date: moment()
            .add(1, 'd')
            .format('YYYY年MM月DD日')
        }
      }
      await sendTxt(option);
      await saveHistory(cde);
    }
  }
  return 'OK'
}

export const verifyNotify = async() => {
  if (HOLIDAY_SEND === 'true' && !isHoliday()) {
    return;
  }
  // 查询今天创建的历史
  let todaySchedules = await getHistories();
  // 今天尚未确认的任务
  let unConfirmed = todaySchedules.filter(t => {
    return !t.confirmed
  });
  // 查询是否有确认短信
  for (let i = 0; i < unConfirmed.length; i++) {
    const objisReply = await isReply(unConfirmed[i].mobile);
    if (objisReply) {
      // 更新schedule
      unConfirmed[i].confirmed = true;
      unConfirmed[i].sendVerifyConfirm = true;
      const updateRst = await updateHistrty(unConfirmed[i]);
      console.log(updateRst);
      // 回了确认短信，发短信给于水清和王燕妮
      // Todo修改模板
      await sendTxt({
        mobile: LEADER_MOBILE1,
        templateId: 'SMS_128635142',
        params: {
          name: unConfirmed[i].name,
          hospital: '',
          time: unConfirmed[i].date
        }
      });
      await sendTxt({
        mobile: LEADER_MOBILE2,
        templateId: 'SMS_128635142',
        params: {
          name: unConfirmed[i].name,
          hospital: '',
          time: unConfirmed[i].date
        }
      });
    }
  }
}

export const reNotify = async() => {
  if (HOLIDAY_SEND === 'true' && !isHoliday()) {
    return;
  }
  // 查询今天创建的历史
  let todaySchedules = await getHistories();
  // 今天尚未确认的任务
  let unConfirmed = todaySchedules.filter(t => {
    return !t.confirmed
  });
  // 初始化形容词
  const adjs = await getAdjectives();
  for (let i = 0; i < unConfirmed.length; i++) {
    let objisReply = await isReply(unConfirmed[i].mobile); // 是否回复了短信
    if (!objisReply) {
      // 发给当事人
      await sendTxt({
        mobile: unConfirmed[i].mobile,
        templateId: 'SMS_145501348',
        params: {
          adjective: adjs.randomElement(),
          name: unConfirmed[i].nickname,
          date: moment()
            .add(1, 'd')
            .format('YYYY年MM月DD日')
        }
      });
      // 发给于水清
      await sendTxt({
        mobile: LEADER_MOBILE1,
        templateId: 'SMS_128635144',
        params: {
          name: unConfirmed[i].name,
          time: unConfirmed[i].date,
          phone: unConfirmed[i].mobile
        }
      });
      // 发给燕妮
      await sendTxt({
        mobile: LEADER_MOBILE1,
        templateId: 'SMS_128635144',
        params: {
          name: unConfirmed[i].name,
          time: unConfirmed[i].date,
          phone: unConfirmed[i].mobile
        }
      });
    }
  }
}
// HackArray
Array.prototype.randomElement = function () {
  return this[Math.floor(Math.random() * this.length)]
}