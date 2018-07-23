import lodash from 'lodash' // could not use '_' here
import moment from 'moment'

export const smses = async (_, args, { getDb }) => {
  console.log('sms query executed...')
  // tslint:disable-next-line:radix
  const currPage = parseInt(args.currPage) // current page, start at 0.
  // tslint:disable-next-line:radix
  const size = parseInt(args.size) // page size

  const db = await getDb()

  let mobileFilter = new RegExp('.*')
  if (args.mobile) {
    mobileFilter = new RegExp(lodash.trim(args.mobile))
  }

  const sms = await db
    .collection('sms')
    .find({
      mobile: mobileFilter,
    })
    .sort({ createdAt: -1 })
    .skip(currPage * size)
    .limit(size)
    .toArray()

  sms.forEach(item => {
    item.details = JSON.stringify(item)
    item.createdAt = new moment(item.createdAt).format('YYYY/MM/DD, HH:mm:ss')
  })

  const smsCount = await db.collection('sms').count({
    mobile: mobileFilter,
  })

  const result = {}
  result.sms = sms
  result.currPage = currPage
  result.totalPage = lodash.ceil(smsCount / size)
  result.size = size
  result.totalRecords = smsCount
  result.timestamp = new moment().format('YYYY/MM/DD, HH:mm:ss')
  return result
}
