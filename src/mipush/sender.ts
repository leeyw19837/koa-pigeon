
import { APP_SECRET, PACKAGE_NAME, ALIAS_URL, TYPE_MAP } from './constants'
import { get } from 'lodash'
const request = require('request-promise')
export const sender = async ({ type = 'CHAT', pushId, description, db, title = '护血糖' }) =>{

    const temp = await db.collection('bloodglucoses').find({patientId:pushId}).sort({createdAt:-1}).limit(1).toArray()[0]
    console.log(temp,'-----')
    const systemName = get(temp,'deviceContext.systemName','ios')
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

    console.log(formData, 'mipush')
    const response = await request(options)

    console.log(response, 'mipush')
    //向db插入一条推送记录

}