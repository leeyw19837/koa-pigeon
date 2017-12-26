
import { APP_SECRET, PACKAGE_NAME, ALIAS_URL, TYPE_MAP } from './constants'
import { get } from 'lodash'
const request = require('request-promise')

export const sender = async ({ type = 'CHAT', pushId, description, db, title = '护血糖' }) =>{

    const arr = await db.collection('bloodglucoses').find({author: pushId})
        .sort({createdAt: -1}).limit(1).toArray()
    const data = arr[0]
    console.log(data, 'mipush=00=======')
    if(data && data.deviceContext.systemName){
        const systemName = get(data,'deviceContext.systemName','android').toLowerCase()
        realSender({type, pushId, description, db, title,systemName})
    } else{
        realSender({type, pushId, description, db, title,systemName:'android'})
        realSender({type, pushId, description, db, title,systemName:'ios'})
    }
}

const realSender = async ({ type = 'CHAT', pushId, description, db, title = '护血糖',systemName }) =>{
    const notifyForeGround = type === 'CHAT' ? '0' : '1'

    //请求小米发出推送
    const formData = {
        alias: pushId,
        restricted_package_name: PACKAGE_NAME[systemName],
        payload: JSON.stringify({ type }),
        pass_through: 0,
        notify_type: -1,
        notify_id: TYPE_MAP[type] || 1,
        extra: {
          notify_foreground: notifyForeGround,
        },
        title,
        description,
    }

    const options = {
        method: 'POST',
        uri: ALIAS_URL,
        headers: {
          Authorization: `key=${APP_SECRET[systemName]}`,
        },
        form: formData,
    }

    console.log(options, 'mipush')
    const response = await request(options)

    console.log(response, 'mipush')
    //向db插入一条推送记录

}