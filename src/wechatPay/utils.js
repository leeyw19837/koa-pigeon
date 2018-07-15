const crypto = require('crypto')

const toQueryString = obj =>
  Object.keys(obj)
    .filter(key => key !== 'sign' && obj[key] !== undefined && obj[key] !== '')
    .sort()
    .map(key => key + '=' + obj[key])
    .join('&')

const md5 = (str, encoding = 'utf8') =>
  crypto
    .createHash('md5')
    .update(str, encoding)
    .digest('hex')

/**
 * 第一步，设所有发送或者接收到的数据为集合M，将集合M内非空参数值的参数按照参数名ASCII码从小到大排序（字典序），使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串stringA。

  特别注意以下重要规则：

  ◆ 参数名ASCII码从小到大排序（字典序）；
  ◆ 如果参数的值为空不参与签名；
  ◆ 参数名区分大小写；
  ◆ 验证调用返回或微信主动通知签名时，传送的sign参数不参与签名，将生成的签名与该sign值作校验。
  ◆ 微信接口可能增加字段，验证签名时必须支持增加的扩展字段
  第二步，在stringA最后拼接上key得到stringSignTemp字符串，并对stringSignTemp进行MD5运算，再将得到的字符串所有字符转换为大写，得到sign值signValue
 * @param {*} params 
 * @param {*} partnerKey 
 */
export const sign = (params, partnerKey) => {
  const str = `${toQueryString(params)}&key=${partnerKey}`
  return md5(str).toUpperCase()
}

/**
 * 生成随机数算法
 * @param {*} length
 */
export const generate = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let noceStr = ''
  const maxPos = chars.length
  while (length--) noceStr += chars[(Math.random() * maxPos) | 0]
  return noceStr
}
/**
 * 标准北京时间，时区为东八区，自1970年1月1日 0点0分0秒以来的秒数。注意：部分系统取到的值为毫秒级，需要转换成秒(10位数字)
 */
export const getTimeStamp = () => Math.round(new Date().getTime() / 1000)
