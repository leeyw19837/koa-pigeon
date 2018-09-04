import request from 'request-promise'
import { get } from 'lodash'
const host = process.env.AI_HOST

const rd = (lower, upper) => {
  return Math.floor(Math.random() * (upper - lower + 1)) + lower
}

const randomColor = () => {
  const r = rd(0, 256),
    g = rd(0, 256),
    b = rd(0, 256)
  return `rgb(${r}, ${g}, ${b})`
}

export const colorful = opt => {
  switch (opt) {
    case '饮食':
      return '#B2EBF2'
    case '问候':
      return '#BBDEFB'
    case '病情咨询':
      return '#FFCCBC'
    case '用药':
      return '#FFF9C4'
    case '就诊':
      return '#C8E6C9'
    case '其它':
      return '#F5F5F5'
    default:
      return randomColor()
  }
}
/**
 * 获取所有分类
 */
export const categories = async () => {
  try {
    const route = '/classifycategory'
    const method = 'get'
    const options = {
      method,
      uri: `${host}${route}`,
      json: true,
    }
    const res = await request(options)
    const rst = []
    if (res && res.result instanceof Array && res.result.length > 0) {
      res.result.forEach(opt => {
        rst.push({
          value: opt,
          color: colorful(opt),
        })
      })
      return rst
    }
  } catch (e) {
    console.error(`获取所有分类接口调用错误：${e.message}`)
    return []
  }
}

/**
 * 判断文本聊天内容的类型
 * @param {String} content 文本聊天内容
 */
export const classify = async content => {
  try {
    const route = '/classify'
    const method = 'post'
    const options = {
      method,
      uri: `${host}${route}`,
      body: { document: content },
      json: true,
    }
    const res = await request(options)
    const result = get(res, 'result[0].res[0]', undefined)
    if (result) {
      let max = -100
      let tag = ''
      Object.keys(result).forEach(k => {
        if (result[k] > max) {
          max = result[k]
          tag = k
        }
      })
      return tag
    }
    throw new Error(res)
  } catch (e) {
    console.error(`获取目标分类接口调用错误：${e.message}`)
    return ''
  }
}

/**
 *
 * @param {String} content 文本聊天内容
 * @param {String} tag 聊天内容类型
 */
export const retrain = async (content, tag) => {
  try {
    const route = '/classifyretrain'
    const method = 'post'
    const options = {
      method,
      uri: `${host}${route}`,
      body: { document: content, tag },
      json: true,
    }
    const res = await request(options)
    if (res && res.code.toString() === '200') {
      return true
    }
    throw new Error(res)
  } catch (e) {
    console.error(`修正分类接口调用错误：${e.message}`)
    return false
  }
}
