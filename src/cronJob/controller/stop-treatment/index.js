import { sendTxt } from '../../../common'

export const stop19SprintFestival = async ({ isTest, mobile }) => {
  const templateId = 'SMS_154500005'
  const hospitalInfos = [
    {
      htcId: 'healthCareTeam1',
      holiday: '春节',
      hospitalName: '北大医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月11日重新开诊',
      hospital: '北大医院',
    },
    {
      htcId: 'healthCareTeam2',
      holiday: '春节',
      hospitalName: '潞河医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月13日重新开诊',
      hospital: '潞河医院',
    },
    {
      htcId: 'healthCareTeam3',
      holiday: '春节',
      hospitalName: '朝阳医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月13日重新开诊',
      hospital: '朝阳医院',
    },
    {
      htcId: 'healthCareTeam5',
      holiday: '春节',
      hospitalName: '北京大学首钢医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月12日重新开诊',
      hospital: '北京大学首钢医院',
    },
    {
      htcId: 'healthCareTeam6',
      holiday: '春节',
      hospitalName: '北京中医药大学东方医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月14日重新开诊',
      hospital: '北京中医药大学东方医院',
    },
    {
      htcId: 'healthCareTeam7',
      holiday: '春节',
      hospitalName: '中国人民解放军总医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月11日重新开诊',
      hospital: '中国人民解放军总医院',
    },
    {
      htcId: 'healthCareTeam9',
      holiday: '春节',
      hospitalName: '深圳市人民医院',
      holidayTime: '2月4日-2月10日停诊',
      newTime: '2月11日重新开诊',
      hospital: '深圳市人民医院',
    },
  ]
  const allUsers = await db
    .collection('users')
    .find({
      patientState: 'ACTIVE',
      healthCareTeamId: { $exists: 1 },
      'dontDisturb.examineReminder': { $ne: true },
    })
    .toArray()
  if (isTest) {
    try {
      await sendTxt({
        mobile: mobile || '18612201226',
        templateId,
        params: {
          holiday: '春节',
          holidayTime: '2月4日-2月10日停诊',
          newTime: '2月11日重新开诊',
          hospital: '北大医院',
          hospitalName: '北大医院',
        },
      })
    } catch (error) {
      console.log('~error')
    }
  }
  for (let i = 0; i < hospitalInfos.length; i++) {
    const {
      htcId,
      holiday,
      hospitalName,
      holidayTime,
      newTime,
      hospital,
    } = hospitalInfos[i]
    const defaultParams = {
      holiday,
      hospitalName,
      holidayTime,
      newTime,
      hospital,
    }
    const users = allUsers.filter(o => o.healthCareTeamId.indexOf(htcId) !== -1)
    console.log(`开始给 ${hospitalName} 发送 ${users.length} 条短信`)
    for (let j = 0; j < users.length; j++) {
      const user = users[j]
      if (user && user.username) {
        const option = {
          templateId,
          mobile: user.username,
          params: defaultParams,
        }
        try {
          if (!isTest) {
            await sendTxt(option)
          }
        } catch (error) {
          console.log('~error')
        }
      }
    }
    console.log(`完成发送 ${users.length} 条短信`)
  }
}
