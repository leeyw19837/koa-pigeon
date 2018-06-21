const redis = require('redis')
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
export const addDelayEvent = (key, delay = 10 * 60) => {
  client.setex(`${eventKeyPrefix}_${key}`, delay, 'delay event', err => {
    if (err) {
      return console.log('添加延迟事件失败：', err)
    }
    console.log('添加延迟事件成功')
  })
}

// 删除定时任务事件
export const deleteDelayEvent = (key, delay = 10 * 60) => {
  client.del(`${eventKeyPrefix}_${key}`, err => {
    if (err) {
      return console.log('删除延迟事件失败：', err)
    }
    console.log('删除延迟事件成功')
  })
}

// 订阅消息 当匹配到自定义事件key即为定时时间到
sub.on('pmessage', (pattern, channel, message) => {
  // match key
  const keyMatcher = new RegExp(`^${eventKeyPrefix}_(\\S+)$`)
  const result = message.match(keyMatcher)
  if (result) {
    // 在这里添定时任务
    console.log('订阅消息：%s', result[1])
  }
})
// 订阅频道
sub.psubscribe('__key*__:expired')
