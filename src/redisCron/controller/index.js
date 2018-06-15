const redis = require('redis')

const redis_config = {
  host: 'redis',
  port: 6379,
}

const client = redis.createClient(redis_config)
const sub = redis.createClient(redis_config)

client.on('error', function(err) {
  console.log('client Error ' + err)
})

sub.on('error', function(err) {
  console.log('sub Error ' + err)
})

const eventKeyPrefix = 'custom_event_' // 任务列表
export const addDelayEvent = (key, delay = 10 * 60) => {
  client.setex(`${eventKeyPrefix}_${key}`, delay, 'delay event', err => {
    if (err) {
      return console.log('添加延迟事件失败：', err)
    }
    console.log('添加延迟事件成功')
  })
}

sub.on('pmessage', (pattern, channel, message) => {
  // match key
  const keyMatcher = new RegExp(`^${eventKeyPrefix}_(\\S+)$`)
  const result = message.match(keyMatcher)
  if (result) {
    console.log('订阅消息：%s', result[1])
  }
})
// 订阅频道
sub.psubscribe('__key*__:expired')
