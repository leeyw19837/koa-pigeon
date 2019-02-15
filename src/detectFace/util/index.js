import moment from "moment";

export const getUserInfoByIdCard = (idCard) => {
  if (!idCard) {
    return {}
  }
//获取出生日期
  const dateOfBirth = moment(idCard.substring(6, 14), 'YYYYMMDD').toDate();
//获取性别
  let gender = '';
  if (parseInt(idCard.substr(16, 1)) % 2 === 1) {
//男
    gender = "male";
  } else {
//女
    gender = "female";
  }
  return {dateOfBirth, gender}
}

// 获取拼音
export const getPinyinUsername = name => {
  const clearName = name.trim()
  const pinyinFull = PinyinHelper.convertToPinyinString(
    clearName,
    '',
    PinyinFormat.WITHOUT_TONE,
  )
  let initial = pinyinFull[0]
  if (!/[A-Za-z]/.test(initial)) {
    initial = '~'
  }
  const pinyin = {
    full: pinyinFull,
    short: PinyinHelper.convertToPinyinString(
      clearName,
      '',
      PinyinFormat.FIRST_LETTER,
    ),
    initial,
  }
  return pinyin
}

/*** 包装所有的restful返回值的格式*/
export const responseMessage = (resultStatus, resultContent, resultMessage) => {
  return {
    resultStatus,
    resultContent,
    resultMessage
  }
}
