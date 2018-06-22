import * as moment from 'moment'
import { get } from 'lodash'
import { bloodMeasurementPlans } from '../queries/bloodMeasurementPlans'
import { sendNeedleTextChatMessage } from './sendNeedleTextChatMessage'

export const changeChatCardStatus = async (_, args, context) => {
    /**
     * dateType的取值:
     * 七天的卡片:BEFORE_SEVEN_DAYS
     * 三天天的卡片:BEFORE_THREE_DAYS
     * 
     * operationType的取值:
     * 确定：CONFIRM
     * 改期：CHANGE_DATE
     * 不确定:UNSURE
     * 知道了:KNOWN
     */
    const {
        messageId,
        patientId,
        dateType,
        operationType,
        outpatientTime,
        recordId,
    } = args;

    const status = ''
    const userId = '66728d10dc75bc6a43052036'
    const db = await context.getDb();

    const measurement = await bloodMeasurementPlans(_, args, context)
    const measurePercent = getContent(measurement, operationType)
    const { textContent, sourceType } = getTextContent(measurePercent, operationType, dateType, outpatientTime)

    if (dateType == 'BEFORE_SEVEN_DAYS') {
        if (operationType == 'CONFIRM') {
            status = 'SELF_CONFIRMED'
            await db
                .collection('appointments')
                .update({ _id: recordId }, { $set: { confirmStatus: 'APP7Confirm' } })
        } else if (operationType == 'CHANGE_DATE') {
            status = 'POSTPONING'
            userId = patientId
        } else if (operationType == 'UNSURE') {
            status = 'UNCERTAIN'
        }
    } else {
        if (operationType == 'CONFIRM') {
            status = 'SELF_CONFIRMED'
            await db
                .collection('appointments')
                .update({ _id: recordId }, { $set: { confirmStatus: 'APP3Confirm' } })
        } else if (operationType == 'KNOWN') {
            status = 'SELF_CONFIRMED'
            await db
                .collection('appointments')
                .update({ _id: recordId }, { $set: { confirmStatus: 'APPDoubleConfirm' } })
        } else if (operationType == 'CHANGE_DATE') {
            status = 'POSTPONING'
            userId = patientId
        }
    }

    const chatRoom = await db
        .collection('needleChatRooms')
        .findOne({ 'participants.userId': patientId })
    const chatRoomId = get(chatRoom, '_id')

    if (status) {
        const result = await db
            .collection('needleChatMessages')
            .update(
                { _id: messageId },
                { $set: { "content.status": status } }
            )
    }

    const sendArgs = {
        userId: userId,
        chatRoomId: chatRoomId,
        text: textContent,
        sourceType: sourceType,
    }
    const updateResult = await sendNeedleTextChatMessage(_, sendArgs, context)

    if (result && !!result.result.ok) {
        return true
    }
    return false
}

//根据测量完成比率返回不同的话术
const getTextContent = (measurePercent, operationType, dateType, outpatientTime) => {
    let textContent = ''
    let sourceType = '1'
    const endTime = moment(outpatientTime).format("YYYY-MM-DD")
    const diffTime = moment(endTime).diff(moment(), 'days') + 1
    if (dateType == 'BEFORE_SEVEN_DAYS') {
        diffTime = moment(endTime).diff(moment(), 'days') + 2
    }

    //确定
    if (operationType == 'CONFIRM') {
        //7天卡片
        if (dateType == 'BEFORE_SEVEN_DAYS') {
            if (measurePercent == 0) {
                sourceType = '3'
                textContent = `还有${diffTime}天您就要来就诊了，但我们还没有收到您近7天的血糖监测数据，医生有可能无法对您的情况作更全面的判断和针对性的指导，请您抓紧测量`
            } else if (measurePercent < 0.5) {
                sourceType = '2'
                textContent = `还有${diffTime}天您就要来就诊了，您近7天还没有按照医生给您的血糖监测方案进行监测，医生有可能无法对您的情况作更全面的判断和针对性的指导，请您继续完善`
            } else {
                sourceType = '1'
                textContent = `还有${diffTime}天您就要来就诊了，您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
            }
            //3天卡片    
        } else {
            if (measurePercent == 0) {
                sourceType = '12'
                textContent = `还有${diffTime}天您就要来就诊了，但我们还没有收到您最近的血糖监测数据，医生有可能无法对您的情况作更全面的判断和针对性的指导，您还有3天机会按照血糖监测方案进行测量`
            } else if (measurePercent < 0.5) {
                sourceType = '11'
                textContent = `还有${diffTime}天您就要来就诊了，您最近还没有按照医生给您的血糖监测方案进行监测，医生有可能无法对您的情况作更全面的判断和针对性的指导，您还有3天机会继续完善`
            } else {
                sourceType = '10'
                textContent = `还有${diffTime}天您要来就诊了，您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
            }
        }
        //改期    
    } else if (operationType == 'CHANGE_DATE') {
        sourceType = '13'
        textContent = `照护师您好，我要改期`
        //知道了
    } else if (operationType == 'KNOWN') {
        if (measurePercent == 0) {
            sourceType = '6'
            textContent = `还有${diffTime}天您就要来就诊了，但我们还没有收到您最近的血糖监测数据，医生有可能无法对您的情况作更全面的判断和针对性的指导，您还有3天机会按照血糖监测方案进行测量`
        } else if (measurePercent < 0.5) {
            sourceType = '5'
            textContent = `还有${diffTime}天您就要来就诊了，您最近还没有按照医生给您的血糖监测方案进行监测，医生有可能无法对您的情况作更全面的判断和针对性的指导，您还有3天机会继续完善`
        } else {
            sourceType = '4'
            textContent = `还有${diffTime}天您要来就诊了，您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
        }
        //不确定    
    } else {
        //7天卡片
        if (dateType == 'BEFORE_SEVEN_DAYS') {
            if (measurePercent == 0) {
                sourceType = '9'
                textContent = `我们将会在开诊前3天再与您确认参加情况。我们还没有收到您近7天的血糖监测数据，医生无法对您的情况作更全面的判断和针对性的指导，请您抓紧测量`
            } else if (measurePercent < 0.5) {
                sourceType = '8'
                textContent = `我们将会在开诊前3天再与您确认参加情况。由于您近7天还没有按照医生给您的血糖监测方案进行监测，医生无法对您的情况作更全面的判断和针对性的指导，请您继续完善`
            } else {
                sourceType = '7'
                textContent = `我们将会在开诊前3天再与您确认参加情况。您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
            }
            //3天卡片无不确定按钮
        } else {
        }
    }
    return { sourceType, textContent }
}

//根据测量结果，算出各种模组的测量完成比率
const getContent = bloodData => {
    const measurePercent
    const {
        morning, midday, evening, beforeSleep,
    } = get(bloodData, 'actualMeasure')
    const morningPairing = morning.pairing
    const middayPairing = midday.pairing
    const eveningPairing = evening.pairing
    const beforeSleepPairing = beforeSleep.pairing
    const morningCount = morning.count
    const middayCount = midday.count
    const eveningCount = evening.count
    const beforeSleepCount = beforeSleep.count
    const modules = get(bloodData, 'modules')
    switch (bloodData.type) {
        case 'A':
            {
                let aCount = 0
                if (morningPairing > 0) {
                    aCount = aCount + 1
                }
                if (middayPairing > 0) {
                    aCount = aCount + 1
                }
                if (eveningPairing > 0) {
                    aCount = aCount + 1
                }
                measurePercent = aCount / 3
                return measurePercent
            }
            break
        case 'B':
            {
                let bCount = 0
                if (
                    [morningPairing, middayPairing, eveningPairing, beforeSleepPairing].reduce((a, b) => a + b) >= 2
                ) {
                    bCount = 2
                }
                if (
                    [morningPairing, middayPairing, eveningPairing, beforeSleepPairing].reduce((a, b) => a + b) === 1
                ) {
                    bCount = 1
                }
                measurePercent = bCount / 2
                return measurePercent
            }
            break
        case 'C':
            {
                let cCount = 0
                if (morningPairing >= 2) {
                    cCount = cCount + 2
                }
                if (middayPairing >= 2) {
                    cCount = cCount + 2
                }
                if (eveningPairing >= 2) {
                    cCount = cCount + 2
                }
                if (morningPairing === 1) {
                    cCount = cCount + 1
                }
                if (middayPairing === 1) {
                    cCount = cCount + 1
                }
                if (eveningPairing === 1) {
                    cCount = cCount + 1
                }
                measurePercent = bCount / 6
                return measurePercent
            }
            break
        case 'D':
            {
                let dCount = 0
                if (morningPairing > 0) {
                    dCount = dCount + 1
                }
                if (middayPairing > 0) {
                    dCount = dCount + 1
                }
                if (eveningPairing > 0) {
                    dCount = dCount + 1
                }
                if (beforeSleepCount >= 1) {
                    dCount = dCount + 1
                }
                measurePercent = dCount / 4
                return measurePercent
            }
            break
        case 'E':
            {
                let eCount = 0
                if (morningCount >= 7) {
                    eCount = eCount + 7
                }
                if (eveningCount >= 7) {
                    eCount = eCount + 7
                }
                if (morningCount > 0 && morningCount < 7) {
                    eCount = eCount + morningCount
                }
                if (eveningCount > 0 && eveningCount < 7) {
                    eCount = eCount + morningCount
                }
                measurePercent = eCount / 14
                return measurePercent
            }
            break
        case 'F':
            {
                let fCount = 0
                if (morningCount >= 3) {
                    fCount = fCount + 3
                }
                if (middayCount >= 3) {
                    fCount = fCount + 3
                }
                if (eveningCount >= 3) {
                    fCount = fCount + 3
                }
                if (morningCount > 0 && morningCount < 3) {
                    fCount = fCount + morningCount
                }
                if (middayCount > 0 && middayCount < 3) {
                    fCount = fCount + morningCount
                }
                if (eveningCount > 0 && eveningCount < 3) {
                    fCount = fCount + morningCount
                }
                measurePercent = fCount / 9
                return measurePercent
            }
            break
        default:
            {
                let noCount = 0
                let allCount = 0
                const { quantity, unit } = get(modules, 'noLimit')
                if (quantity) {
                    // 不限餐
                    const unitInfo = unit === 'pairing' ? '对' : '次'
                    allCount = allCount + quantity

                    if (unit === 'pairing') {
                        const num = [
                            morningPairing,
                            middayPairing,
                            eveningPairing,
                            beforeSleepPairing,
                        ].reduce((a, b) => a + b)
                        if (num >= quantity) {
                            noCount = noCount + num
                        }
                        if (num === 0) {
                        }
                    }
                    if (unit === 'count') {
                        const num = [morningCount, middayCount, eveningCount, beforeSleepCount].reduce((a, b) => a + b)
                        if (num >= quantity) {
                            noCount = noCount + num
                        }
                        if (num === 0) {
                        }
                    }
                }
                const morning_unit = modules.morning.unit
                const midday_unit = modules.midday.unit
                const evening_unit = modules.evening.unit
                const beforeSleep_unit = modules.beforeSleep.unit

                const morning_quantity = modules.morning.quantity
                const midday_quantity = modules.midday.quantity
                const evening_quantity = modules.evening.quantity
                const beforeSleep_quantity = modules.beforeSleep.quantity
                if (
                    morning_unit === 'pairing' ||
                    midday_unit === 'pairing' ||
                    evening_unit === 'pairing'
                ) {
                    let quantityTotal = 0
                    let details = ''
                    let actualDetails = ''
                    const morning_actual = morning.pairing
                    const midday_actual = midday.pairing
                    const evening_actual = evening.pairing
                    if (morning_quantity > 0) {
                        quantityTotal += morning_quantity
                        noCount = noCount + morning_actual
                    }
                    if (midday_quantity > 0) {
                        quantityTotal += midday_quantity
                        if (midday_actual >= midday_quantity) {
                            noCount = noCount + midday_quantity
                        }
                        noCount = noCount + midday_actual
                    }
                    if (evening_quantity > 0) {
                        quantityTotal += evening_quantity
                        if (evening_actual >= evening_quantity) {
                            noCount = noCount + evening_quantity
                        }
                        noCount = noCount + evening_actual

                    }
                    allCount = allCount + quantityTotal
                }
                if (
                    morning_unit === 'count' ||
                    midday_unit === 'count' ||
                    evening_unit === 'count' ||
                    beforeSleep_unit === 'count'
                ) {
                    let quantityTotal = 0
                    let details = ''
                    let actualDetails = ''
                    const morning_actual = morning.count
                    const midday_actual = midday.count
                    const evening_actual = evening.count
                    const beforeSleep_actual = beforeSleep.count
                    if (morning_quantity > 0) {
                        quantityTotal += morning_quantity
                        if (morning_actual >= morning_quantity) {
                            noCount = noCount + morning_quantity
                        }
                        noCount = noCount + morning_actual
                    }
                    if (midday_quantity > 0) {
                        quantityTotal += midday_quantity
                        if (midday_actual >= midday_quantity) {
                            noCount = noCount + midday_quantity
                        }
                        noCount = noCount + midday_actual
                    }
                    if (evening_quantity > 0) {
                        quantityTotal += evening_quantity
                        if (midday_actual >= evening_quantity) {
                            noCount = noCount + evening_quantity
                        }
                        noCount = noCount + evening_actual
                    }
                    if (beforeSleep_quantity > 0) {
                        quantityTotal += beforeSleep_quantity
                        if (beforeSleep_actual >= beforeSleep_quantity) {
                            noCount = noCount + beforeSleep_quantity
                        }
                        noCount = noCount + beforeSleep_actual
                    }
                    allCount += quantityTotal
                }
                measurePercent = noCount / allCount
                return measurePercent
            }
            break
    }
}
