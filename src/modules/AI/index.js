import request from 'request-promise'
import { get, orderBy } from 'lodash'
const host = process.env.AI_HOST
const modelTrainHost = process.env.AI_RETRAIN_HOST

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
      return { color: '#B2EBF2', sortId: 200 }
    case '问候':
      return { color: '#BBDEFB', sortId: 100 }
    case '病情咨询':
      return { color: '#FFCCBC', sortId: 500 }
    case '用药':
      return { color: '#FFF9C4', sortId: 400 }
    case '就诊':
      return { color: '#C8E6C9', sortId: 300 }
    case '其它':
      return { color: '#F5F5F5', sortId: 50000 }
    default:
      return { color: randomColor(), sortId: rd(40000, 49999) }
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
    // res.result.push('1新增测试1')
    if (res && res.result instanceof Array && res.result.length > 0) {
      res.result.forEach(opt => {
        const cas = colorful(opt)
        rst.push({
          value: opt,
          color: cas.color,
          sort: cas.sortId,
        })
      })
      return orderBy(rst, ['sort', 'asc'])
    } else {
      console.error(`获取所有分类接口调用错误：${res}`)
      return []
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

/**
 * AI QA search interface
 * @param {String} question
 */
export const qa = async q => {
  const data = {
    matched: false,
    qa: [],
    message: '',
  }
  try {
    const route = '/search'
    const method = 'post'
    const options = {
      method,
      uri: `${host}${route}`,
      body: { q },
      json: true,
    }
    const res = await request(options)
    if (
      res &&
      res.code.toString() === '200' &&
      res.result &&
      res.result.length > 0
    ) {
      data.matched = true
      data.message = 'ok'
      data.qa = res.result.reduce((last, curr) => {
        curr.source.esorce = curr.esorce
        curr.source.id = curr.id
        last.push(curr.source)
        return last
      }, [])
    } else {
      data.matched = false
      data.message = res
    }
  } catch (e) {
    data.matched = false
    data.message = e.message
  }
  return data
}

/**
 * 修正QA接口
 * @param {String} sentence Q
 * @param {String} norm A
 */
export const modelRetrain = async (sentence, norm) => {
  try {
    const immidiately = false
    const body = { sentence, norm, immidiately }
    const route = '/retrain'
    const method = 'post'
    const options = {
      method,
      uri: `${modelTrainHost}${route}`,
      body,
      json: true,
    }
    const res = await request(options)
    if (res && res.code.toString() === '200') {
      return true
    }
    throw new Error(res)
  } catch (e) {
    console.error(`修正QA接口调用错误：${e.message}`)
    return false
  }
}

export const addQA = async (q, a) => {
  try {
    const route = '/question'
    const method = 'post'
    const options = {
      method,
      uri: `${host}${route}`,
      body: {
        q,
        a,
      },
      json: true,
    }
    const res = await request(options)
    if (res && res.code && res.code.toString() === '200') {
      return true
    }
    console.error('create new qa interface error(Tianjin): ')
    console.error(res)
    return false
  } catch (e) {
    console.error('create new qa interface error(Tianjin): ')
    console.error(res)
    return false
  }
}
