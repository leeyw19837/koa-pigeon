const moment = require('moment')
const lodash = require('lodash') //could not use '_' here
import { IContext } from '../types'
export const smses = async (_, args, { getDb }: IContext) => {
  console.log('sms query executed...')
  let currPage = parseInt(args.currPage) // current page, start at 0.
  let size = parseInt(args.size) //page size

  const db = await getDb()

  let mobileFilter = new RegExp('.*')
  if (args.mobile) {
    mobileFilter = new RegExp(lodash.trim(args.mobile))
  }

  let sms: Array<any> = await db.collection('sms').find({
    mobile: mobileFilter
  }).sort({ createdAt: -1 }).skip(currPage * size).limit(size).toArray()

  sms.forEach(item => {
    item.details = JSON.stringify(item)
    item.createdAt = new moment(item.createdAt).format('YYYY/MM/DD, HH:mm:ss')
  })

  let smsCount = await db.collection('sms').count({
    mobile: mobileFilter
  })

  let result: any = {}
  result.sms = sms
  result.currPage = currPage
  result.totalPage = lodash.ceil(smsCount / size)
  result.size = size
  result.totalRecords = smsCount
  result.timestamp = new moment().format('YYYY/MM/DD, HH:mm:ss')
  return result
}