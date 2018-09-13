import { resolve } from 'url'
import { pubsub } from '../../pubsub'

const redis = require('redis')
import { get } from 'lodash'
import { sendNeedleTextChatMessage } from '../../mutations/sendNeedleTextChatMessage'
// redis 连接配置
const redis_config = {
  host: 'redis',
  port: 6379,
}
// 建立两个客户端 一个负责发布一个负责订阅
const client = redis.createClient(redis_config)
const sub = redis.createClient(redis_config)

// 处理错误信息
client.on('error', function(err) {
  console.log('client Error ' + err)
})

sub.on('error', function(err) {
  console.log('sub Error ' + err)
})

const eventKeyPrefix = 'pigeon_' // key前置内容 用于区分自定义事件和其他事件

// 添加定时任务事件 key为你要记录的内容 delay为延时执行的时间
export const addDelayEvent = async (key, delay = 10 * 60, callback) => {
  client.setex(`${eventKeyPrefix}_${key}`, delay, 'delay event', err => {
    if (err) {
      return console.log('添加延迟事件失败：', err)
    }
    console.log('添加延迟事件成功')
    if (callback) {
      callback()
    }
  })
}

// 删除定时任务事件
export const deleteDelayEvent = async (key, delay = 10 * 60, callback) => {
  client.del(key, err => {
    if (err) {
      return console.log('删除延迟事件失败：', err)
    }
    console.log('删除延迟事件成功')
    if (callback) {
      callback()
    }
  })
}

// keys 查询
export const queryDelayEvent = key => {
  return new Promise((resolve, reject) => {
    client.keys(`${eventKeyPrefix}_${key}*`, (err, replies) => {
      if (err) {
        reject('查询延迟事件失败：', err)
      }
      console.log(replies.length + ' replies:')
      replies.forEach(function(reply, i) {
        console.log('    ' + i + ': ' + reply)
      })
      resolve(replies)
    })
  })
}

// 订阅消息 当匹配到自定义事件key即为定时时间到
sub.on('pmessage', async (pattern, channel, message) => {
  const db = global.db
  // match key
  const keyMatcher = new RegExp(`^${eventKeyPrefix}_(\\S+)$`)
  const result = message.match(keyMatcher)
  if (result) {
    // 在这里执行定时任务时间到了之后的操作
    console.log('订阅消息：%s', result[1])
    const resultArr = result[1].split('_')
    // 订阅消息：bg_88f5578370f3a04743d43fac_BEFORE_LUNCH_16:19
    const messageType = resultArr[0]
    switch (messageType) {
      case 'bg':
        const bgPushMessage = {
          patientId: resultArr[1],
          measurementTime: `${resultArr[2]}_${resultArr[3]}`,
          measurementTimeChinese: `${resultArr[4]}`,
          time: resultArr[5],
        }

        const chatRoom = await db
          .collection('needleChatRooms')
          .findOne({ 'participants.userId': bgPushMessage.patientId })
        const chatRoomId = get(chatRoom, '_id')
        const text = `您已于${bgPushMessage.time}测量了${
          bgPushMessage.measurementTimeChinese
        }血糖，从吃第一口饭算起，您应该测量餐后血糖了。配对监测有助于医生了解您饮食与药物搭配是否合理，请遵医嘱测量`
        const sendArgs = {
          userId: '66728d10dc75bc6a43052036',
          chatRoomId,
          text,
          sourceType: 'AM2H_1',
        }
        console.log('sendArgs', sendArgs)
        const sendResult = await sendNeedleTextChatMessage(null, sendArgs, {})

        console.log(sendResult)

        break

      default:
        break
    }
  }
})
// 订阅频道
sub.psubscribe('__key*__:expired')
