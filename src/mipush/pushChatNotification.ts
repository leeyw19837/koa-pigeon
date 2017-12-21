import { find } from 'lodash'
import { sender } from './sender'
export const pushChatNotification = ({ patient, messageType, text, db }) => {
    if(patient){
        let description = '[新消息] '
        if (messageType === 'AUDIO') {
            description += '收到一条语音'
        } else if (messageType === 'IMAGE') {
            description += '收到一张图片'
        } else if (messageType === 'TEXT') {
            description = text.length > 40 ? description + text.substring(0, 40) : description + text
        }
        sender({
            type: 'CHAT',
            pushId: patient._id+'',
            description,
            db,
        })
    }
}
