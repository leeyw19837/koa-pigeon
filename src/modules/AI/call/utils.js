import moment from 'moment'

const retryWithCount = (fn, retriesLeft = 3, interval = 1000 * 60) => {
  console.log(retriesLeft, '重试')
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch(error => {
        setTimeout(() => {
          if (retriesLeft === 1) {
            reject(error)
            return
          }
          retryWithCount(fn, retriesLeft - 1, interval).then(resolve, reject)
        }, interval)
      })
  })
}

export const retry = retryWithCount

export const transforJob = data => {
  const {
    nickname,
    _id,
    mobile,
    period,
    hospital,
    appointmentTime,
    cdeName,
  } = data
  const timeStamp = moment(appointmentTime)
    .startOf('day')
    .add(period === 'AFTERNOON' ? 14 : 8, 'hours')
    .format('X')

  const bodyData = {
    _id,
    patient: nickname,
    phoneNumber: mobile,
    hospital,
    appointment: timeStamp,
    caregiver: cdeName || '于水清',
    department: '战略合作部',
    callMark: _id,
  }
  return bodyData
}
