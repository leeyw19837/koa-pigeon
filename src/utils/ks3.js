const KS3 = require('ks3')
const ks3 = {
  AK: '4WTrGdPYAlWYAEG2/fjt',
  SK: 'ALmKR2JPA5u8SF39FhVWRTaU1vefRZXZ/Dk4Kf9J',
  bucket: 'paper-king',
}

const AK = ks3.AK
const SK = ks3.SK
const bucketName = ks3.bucket
const client = new KS3(AK, SK, bucketName)
client.config({
  dataType: 'json', // response format setup
})

const normalClient = new KS3(AK, SK, bucketName)

const transBase64ToBuffer = data => {
  return new Buffer(data.replace(/^(data:).*(base64,)/, ''), 'base64')
}

export const uploadBase64Img = (key, data) => {
  return new Promise((resolve, reject) => {
    const imageType = `.${data.substring(
      data.indexOf('/') + 1,
      data.indexOf(';base64,'),
    )}`
    const rData = new Buffer(
      data.replace(/^data:image\/(png|gif|jpeg);base64,/, ''),
      'base64',
    )
    const rKey = key + imageType
    client.object.put(
      {
        Bucket: bucketName,
        Key: rKey,
        ACL: 'public-read',
        Body: rData,
      },
      err => {
        if (err) {
          console.log('ks3 error')
          console.log(err)
          reject()
        } else {
          const url = `http://${bucketName}.ks3-cn-beijing.ksyun.com/${rKey}`
          resolve(url)
        }
      },
    )
  })
}

export const uploadFile = (key, data) => {
  return new Promise((resolve, reject) => {
    const rdata = transBase64ToBuffer(data)
    client.object.put(
      {
        Bucket: bucketName,
        Key: key,
        ACL: 'public-read',
        Body: rdata,
      },
      async err => {
        if (err) {
          console.log('ks3 error')
          console.log(err)
          reject()
        } else {
          const url = `http://${bucketName}.ks3-cn-beijing.ksyun.com/${key}`
          resolve(url)
        }
      },
    )
  })
}

// const KS3 = require('ks3')

// const ks3 = {
//   AK: '4WTrGdPYAlWYAEG2/fjt',
//   SK: 'ALmKR2JPA5u8SF39FhVWRTaU1vefRZXZ/Dk4Kf9J',
//   bucket: 'paper-king',
// }

// const AK = ks3.AK
// const SK = ks3.SK
// const bucketName = ks3.bucket
// const client = new KS3(AK, SK, bucketName)

// client.config({
//   dataType: 'json',
// })

// export const getImageType = data => {
//   const imgType = data.substring(data.indexOf('/') + 1, data.indexOf(';base64,'))
//   return imgType
// }

// export const uploadBase64Img = async (key, data) => {
//   const imageType = `.${data.substring(data.indexOf('/') + 1, data.indexOf(';base64,'))}`

//   const rData = new Buffer(data.replace(/^data:image\/(png|gif|jpeg);base64,/, ''), 'base64')
//   const rKey = key + imageType

//   return new Promise((resolve, reject) => {
//     client.object.put({
//       Bucket: bucketName,
//       Key: rKey,
//       ACL: 'public-read',
//       Body: rData,
//     }, err => {
//       if (err) {
//         reject(err)
//       } else {
//         const url = `http://${bucketName}.kss.ksyun.com/${rKey}`
//         resolve(url)
//       }
//     })
//   })
// }
