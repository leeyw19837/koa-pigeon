import freshId from 'fresh-id'
import { ObjectId } from 'mongodb'
import { pubsub } from '../pubsub'
import { pushChatNotification } from '../mipush'
import { ObjectID } from 'mongodb'
import moment from 'moment'

export const sendSystemChatMessage = async (_, args, { getDb }) => {
    const db = getDb === undefined ? global.db : await getDb()
    let {
        userId,
        chatRoomId,
        text,
        sourceType,
        actualSenderId,
    } = args

    let chatRoom = await db
        .collection('needleChatRooms')
        .findOne({ _id: chatRoomId })

    if (!chatRoom) {
        throw new Error('Can not find chat room')
    }


    // var str1 = "hello {0}".format("world"); //log   hello world
    // var str1 = "我叫{0},性别{1}".format("美男子", "男"); //log 我叫美男子,性别男
    // var user = {name: "美男子",sex: "男",age: 20};
    // var str2 = "我叫{name},性别{sex},今年{age}岁".format(user)

    let configurationContent = db.collection("configurationContent").find({ _id: "56064886ade2f21f36b03134" }).toArray()
    var minHour = configurationContent[0].minHour
    var maxHour = configurationContent[0].maxHour
    var content = configurationContent[0].content
    var mobile = configurationContent[0].mobile
    var curDate = moment(moment(moment(new Date()).hour(maxHour)).minute(0)).second(0)
    var curTime = moment(moment(moment(new Date()).hour(minHour)).minute(0)).second(0)
    var nowHours = moment(new Date()).hour()
    var nowdays = moment(new Date()).day()
    var sendText = '医生在线沟通时间为周一至周五 {0}:00-{1}:00 紧急联系电话：{2}'.format(minHour, maxHour, mobile)

    const assistant = chatRoom.participants.find(p => p.role === '医助' || p.role === '超级护理师' )
    let systemMessageCount = await db.collection('needleChatMessages').find({ senderId: assistant.userId, createdAt: { $lte: curDate, $gte: curTime } }).count()
    if (systemMessageCount > 0) {
        return "已经存在，无需再次插入"
    } else {
        if (nowHours >= maxHour || nowHours < minHour || content.indexOf(nowdays) > -1) {
            const newChatMessageAutoReplied = {
                _id: freshId(),
                messageType: 'TEXT',
                text: sendText,
                senderId: assistant.userId,
                actualSenderId: 'system',
                createdAt: new Date(),
                chatRoomId: chatRoom._id,
                sourceType: 'FROM_SYSTEM',
            }
            await db
                .collection('needleChatMessages')
                .insertOne(newChatMessageAutoReplied)
            pubsub.publish('chatMessageAdded', {
                chatMessageAdded: newChatMessageAutoReplied,
            })
        }
    }
    const sourceTypeRegex = new RegExp(sourceTypeGroup.join('|'), 'i')
    const participants = chatRoom.participants.map(p => {
        if (/system/i.test(actualSenderId)) {
            if (p.role === '患者')
                return { ...p, unreadCount: (p.unreadCount || 0) + 1 }
            return p
        }
        // 如果是系统自动回复的话，照护师的未读数不应该消失
        if (p.userId === participant.userId && !sourceTypeRegex.test(sourceType)) {
            return { ...p, lastSeenAt: new Date(), unreadCount: 0 }
        } else if (p.userId !== participant.userId) {
            return { ...p, unreadCount: (p.unreadCount || 0) + 1 }
        }
        return p
    })
    await db.collection('needleChatRooms').update(
        {
            _id: chatRoomId,
        },
        {
            $set: {
                participants,
                lastMessageSendAt: new Date(),
            },
        },
    )
    chatRoom = await db.collection('needleChatRooms').findOne({ _id: chatRoomId })

    pubsub.publish('chatRoomDynamics', chatRoom)

    chatRoom.participants.map(async p => {
        if (p.userId !== userId) {
            const user = await db.collection('users').findOne({
                _id: { $in: [ObjectID.createFromHexString(p.userId), p.userId] },
            })
            if (user && !user.roles) {
                pushChatNotification({
                    patient: user,
                    messageType: 'TEXT',
                    text,
                    db,
                })
            }
        }
    })

    return "ok"
}  