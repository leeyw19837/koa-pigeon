import moment from 'dayjs' // The moment ALWAYS overwrite original object！fuck moment！
import {ObjectID} from 'mongodb'
import {omit, last, difference, pullAt} from 'lodash'
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

const isHoliday = (date) => {
  // 2018年节假日
  const jrdate_2018 = [
    '2018-09-24',
    '2018-10-01',
    '2018-10-02',
    '2018-10-03',
    '2018-10-04',
    '2018-10-05',
    '2018-12-31',
    '2019-01-01',
    '2019-02-04',
    '2019-02-05',
    '2019-02-06',
    '2019-02-07',
    '2019-02-08',
    '2019-04-05',
    '2019-04-29',
    '2019-04-30',
    '2019-05-01',
    '2019-06-07',
    '2019-09-13',
    '2019-10-01',
    '2019-10-02',
    '2019-10-03',
    '2019-10-04',
    '2019-10-07'
  ]
  // 2018年调休日
  const txr_2018 = [
    '2018-09-29',
    '2018-09-30',
    '2018-12-29',
    '2019-02-02',
    '2019-02-03',
    '2019-04-27',
    '2019-04-28',
    '2019-09-29',
    '2019-10-12'
  ]
  const dateAdd1d = date.add(1, 'd');

  const dayOfWeek = dateAdd1d.day();
  console.log('isHoliday', date.format('YYYY-MM-DD'), 'date add 1d', dateAdd1d.format('YYYY-MM-DD'), dayOfWeek, 'jrindex', jrdate_2018.indexOf(dateAdd1d.startOf('day').format('YYYY-MM-DD')), 'txrindex', txr_2018.indexOf(dateAdd1d.startOf('day').format('YYYY-MM-DD')));
  if (jrdate_2018.indexOf(dateAdd1d.startOf('day').format('YYYY-MM-DD')) > -1 || (txr_2018.indexOf(dateAdd1d.startOf('day').format('YYYY-MM-DD')) < 0 && (dayOfWeek === 0 || dayOfWeek === 6))) {
    console.log('------------------------ is holiday ------------------------');
    return true
  } else {
    console.log('------------------------ is not holiday ------------------------');
    return false
  }

}

const checkDutyCde = async(cdes, date) => {
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
        console.log(periodSpliter, startTime.format('YYYY-MM-DD'), endTime)
        if (date.add(1, 'd').isBefore(startTime)) {
          dutyCdes.push(cde);
          console.log('isBefore', startTime.format('YYYY-MM-DD'), cde);
        }
        if (date.add(1, 'd').isAfter(endTime)) {
          dutyCdes.push(cde);
          console.log('isAfter', endTime.format('YYYY-MM-DD'), cde);
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

export const saveDutyQueue = async(date) => {
  // 查询所有照护师
  const cdes = await getAllCdes();
  const todayDutyCdes = await checkDutyCde(cdes, date);
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

export const sendDutyMessage = async(testDate) => {
  let date = moment();
  if (testDate) {
    date = moment(testDate)
  }
  if (HOLIDAY_SEND === 'true' && !isHoliday(date)) {
    return;
  }

  await saveDutyQueue(date);
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
          date: date
            .add(1, 'd')
            .format('YYYY年MM月DD日')
        }
      }
      await sendTxt(option);
      await saveHistory(cde, date);
    }
  }
  return 'OK'
}

export const verifyNotify = async(testDate) => {
  let date = moment();
  if (testDate) {
    date = moment(testDate)
  }
  if (HOLIDAY_SEND === 'true' && !isHoliday(date)) {
    return;
  }
  // 查询今天创建的历史
  let todaySchedules = await getHistories();
  // 今天尚未确认的任务
  let unConfirmed = todaySchedules.filter(t => {
    return !t.confirmed
  });
  console.log('今天的短信历史——>', todaySchedules);
  console.log('未确认——>', unConfirmed);
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

export const reNotify = async(testDate) => {
  let date = moment();
  if (testDate) {
    date = moment(testDate)
  }
  if (HOLIDAY_SEND === 'true' && !isHoliday(date)) {
    return;
  }
  // 查询今天创建的历史
  let todaySchedules = await getHistories();
  // 今天尚未确认的任务
  let unConfirmed = todaySchedules.filter(t => {
    return !t.confirmed
  });
  console.log('今天的短信历史——>', todaySchedules);
  console.log('未确认——>', unConfirmed);
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
          date: date
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