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
     * 知道了:CONFIRM
     */
    const {
        messageId,
        patientId,
        chatRoomId,
        dateType,
        operationType,
        outpatientTime,
    } = args;

    const status = ''
    const userId = patientId
    const db = await context.getDb();

    const measurement = await bloodMeasurementPlans(_, args, context)
    const measurePercent = getContent(measurement, operationType)
    const { textContent, sourceType } = getTextContent(measurePercent, operationType, dateType, outpatientTime)

    if (dateType == 'BEFORE_SEVEN_DAYS') {
        if (operationType == 'CONFIRM') {
            status = 'SELF_CONFIRMED'
        } else if (operationType == 'CHANGE_DATE') {
            status = 'POSTPONING'
        } else if (operationType == 'UNSURE') {
            status = 'UNCERTAIN'
            userId = '66728d10dc75bc6a43052036'
        }
    } else {
        if (operationType == 'CONFIRM') {
            status = 'SELF_CONFIRMED'
        } else if (operationType == 'CHANGE_DATE') {
            status = 'POSTPONING'
        } else if (operationType == 'KNOWN') {
            status = 'SELF_CONFIRMED'
        }
    }

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

    if (!!result.result.ok) {
        return true
    }
    return false
}

//根据测量完成比率返回不同的话术
const getTextContent = (measurePercent, operationType, dateType, outpatientTime) => {
    let textContent = ''
    let sourceType = '1'
    const endTime = moment(outpatientTime).format("YYYY-MM-DD")
    const diffTime = moment(endTime).diff(moment(), 'days')

    //确定
    if (operationType == 'CONFIRM') {
        //7天卡片
        if (dateType == 'BEFORE_SEVEN_DAYS') {
            if (measurePercent == 0) {
                sourceType = '3'
                textContent = `还有${diffTime}天您就要来复诊了，但我们还没有收到您近七天的血糖监测数据，医生有可能无法对您的情况作更全面的判断和针对性的指导，请您抓紧测量`
            } else if (measurePercent < 0.5) {
                sourceType = '2'
                textContent = `还有${diffTime}天您就要来复诊了，您近7天还没有按照医生给您的血糖监测方案进行监测，医生有可能无法对您的情况作更全面的判断和针对性的指导，请您继续完善`
            } else {
                sourceType = '1'
                textContent = `还有${diffTime}天您就要来复诊了，您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
            }
            //3天卡片    
        } else {
            if (measurePercent == 0) {
                sourceType = '6'
                textContent = `还有${diffTime}天您就要来复诊了，但我们还没有收到您最近的血糖监测数据，医生有可能无法对您的情况作更全面的判断和针对性的指导，您还有3天机会按照血糖监测方案进行测量`
            } else if (measurePercent < 0.5) {
                sourceType = '5'
                textContent = `还有${diffTime}天您就要来复诊了，您最近还没有按照医生给您的血糖监测方案进行监测，医生有可能无法对您的情况作更全面的判断和针对性的指导，您还有3天机会继续完善`
            } else {
                sourceType = '4'
                textContent = `还有${diffTime}天您要来复诊了，您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
            }
        }
        //改期    
    } else if (operationType == 'CHANGE_DATE') {
        sourceType = '10'
        textContent = `照护师您好，我要改期`
        //不确定    
    } else {
        //7天卡片
        if (dateType == 'BEFORE_SEVEN_DAYS') {
            if (measurePercent == 0) {
                sourceType = '9'
                textContent = `我们将会在开诊前三天再与您确认参加情况。我们还没有收到您近7天的血糖监测数据，医生无法对您的情况作更全面的判断和针对性的指导，请您抓紧测量`
            } else if (measurePercent < 0.5) {
                sourceType = '8'
                textContent = `我们将会在开诊前三天再与您确认参加情况。由于您近7天还没有按照医生给您的血糖监测方案进行监测，医生无法对您的情况作更全面的判断和针对性的指导，请您继续完善`
            } else {
                sourceType = '7'
                textContent = `我们将会在开诊前三天再与您确认参加情况。您监测的不错，请继续保持监测，门诊期间医生会根据您的测量结果给您针对性的指导`
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
                // let morningInfo = '早餐前后一对 未完成'
                // let middayInfo = '午餐前后一对 未完成'
                // let eveningInfo = '晚餐前后一对 未完成'
                if (morningPairing > 0) {
                    // morningInfo = '早餐前后一对 已完成'
                    aCount = aCount + 1
                }
                if (middayPairing > 0) {
                    // middayInfo = '午餐前后一对 已完成'
                    aCount = aCount + 1
                }
                if (eveningPairing > 0) {
                    // eveningInfo = '晚餐前后一对 已完成'
                    aCount = aCount + 1
                }
                measurePercent = aCount / 3
                return measurePercent
            }
            break
        case 'B':
            {
                let bCount = 0
                // let measureDetails = '任意餐前后两对 未测量'
                if (
                    [morningPairing, middayPairing, eveningPairing, beforeSleepPairing].reduce((a, b) => a + b) >= 2
                ) {
                    // measureDetails = '任意餐前后两对 已完成两对'
                    bCount = 2
                }
                if (
                    [morningPairing, middayPairing, eveningPairing, beforeSleepPairing].reduce((a, b) => a + b) === 1
                ) {
                    // measureDetails = '任意餐前后两对 已完成一对'
                    bCount = 1
                }
                measurePercent = bCount / 2
                return measurePercent
            }
            break
        case 'C':
            {
                // let morningInfo = '早餐前后2对 未测量'
                // let middayInfo = '午餐前后2对 未测量'
                // let eveningInfo = '晚餐前后2对 未测量'

                let cCount = 0

                if (morningPairing >= 2) {
                    // morningInfo = '早餐前后2对 已完成'
                    cCount = cCount + 2
                }
                if (middayPairing >= 2) {
                    // middayInfo = '午餐前后2对 已完成'
                    cCount = cCount + 2
                }
                if (eveningPairing >= 2) {
                    // eveningInfo = '晚餐前后2对 已完成'
                    cCount = cCount + 2
                }
                if (morningPairing === 1) {
                    // morningInfo = '早餐前后2对 已完成1对'
                    cCount = cCount + 1
                }
                if (middayPairing === 1) {
                    // middayInfo = '午餐前后2对 已完成1对'
                    cCount = cCount + 1
                }
                if (eveningPairing === 1) {
                    // eveningInfo = '晚餐前后2对 已完成1对'
                    cCount = cCount + 1
                }
                measurePercent = bCount / 6
                return measurePercent
            }
            break
        case 'D':
            {
                // let morningInfo = '早餐前后一对 未完成'
                // let middayInfo = '午餐前后一对 未完成'
                // let eveningInfo = '晚餐前后一对 未完成'
                // let beforeSleepInfo = '睡觉前一次 未测量'

                let dCount = 0

                if (morningPairing > 0) {
                    // morningInfo = '早餐前后一对 已完成'
                    dCount = dCount + 1
                }
                if (middayPairing > 0) {
                    // middayInfo = '午餐前后一对 已完成'
                    dCount = dCount + 1
                }
                if (eveningPairing > 0) {
                    // eveningInfo = '晚餐前后一对 已完成'
                    dCount = dCount + 1
                }
                if (beforeSleepCount >= 1) {
                    // beforeSleepInfo = '睡觉前一次 已完成'
                    dCount = dCount + 1
                }
                measurePercent = dCount / 4
                return measurePercent
            }
            break
        case 'E':
            {
                // let morningInfo = '早餐前7次 未测量'
                // let eveningInfo = '晚餐前7次 未测量'

                let eCount = 0

                if (morningCount >= 7) {
                    // morningInfo = '早餐前7次 已完成'
                    eCount = eCount + 7
                }
                if (eveningCount >= 7) {
                    // eveningInfo = '晚餐前7次 已完成'
                    eCount = eCount + 7
                }
                if (morningCount > 0 && morningCount < 7) {
                    // morningInfo = `早餐前7次 已完成${morningCount}次`
                    eCount = eCount + morningCount
                }
                if (eveningCount > 0 && eveningCount < 7) {
                    // eveningInfo = `晚餐前7次 已完成${eveningCount}次`
                    eCount = eCount + morningCount
                }
                measurePercent = eCount / 14
                return measurePercent
            }
            break
        case 'F':
            {
                // let morningInfo = '早餐前3次 未测量'
                // let middayInfo = '午餐前3次 未测量'
                // let eveningInfo = '晚餐前3次 未测量'

                let fCount = 0

                if (morningCount >= 3) {
                    // morningInfo = '早餐前3次 已完成'
                    fCount = fCount + 3
                }
                if (middayCount >= 3) {
                    // middayInfo = '午餐前3次 已完成'
                    fCount = fCount + 3
                }
                if (eveningCount >= 3) {
                    // eveningInfo = '晚餐前3次 已完成'
                    fCount = fCount + 3
                }
                if (morningCount > 0 && morningCount < 3) {
                    // morningInfo = `早餐前3次 已完成${morningCount}次`
                    fCount = fCount + morningCount
                }
                if (middayCount > 0 && middayCount < 3) {
                    // middayInfo = `午餐前3次 已完成${middayCount}次`
                    fCount = fCount + morningCount
                }
                if (eveningCount > 0 && eveningCount < 3) {
                    // eveningInfo = `晚餐前3次 已完成${eveningCount}次`
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
                    // this.contentDetails = `一周${quantity}${unitInfo} `
                    allCount = allCount + quantity

                    if (unit === 'pairing') {
                        const num = [
                            morningPairing,
                            middayPairing,
                            eveningPairing,
                            beforeSleepPairing,
                        ].reduce((a, b) => a + b)
                        if (num >= quantity) {
                            // this.contentOne = '已完成'
                            noCount = noCount + num
                        }
                        if (num === 0) {
                            // this.contentOne = '未测量'
                        }
                        // this.contentOne = `已完成${num}${unitInfo}`
                    }
                    if (unit === 'count') {
                        const num = [morningCount, middayCount, eveningCount, beforeSleepCount].reduce((a, b) => a + b)
                        if (num >= quantity) {
                            // this.contentOne = '已完成'
                            noCount = noCount + num
                        }
                        if (num === 0) {
                            // this.contentOne = '未测量'
                        }
                        // this.contentOne = `已完成${num}${unitInfo}`
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
                        // details += `早上${morning_quantity}对`
                        // actualDetails += `早上已完成${morning_actual}对`
                        noCount = noCount + morning_actual
                    }
                    if (midday_quantity > 0) {
                        quantityTotal += midday_quantity
                        // details += ` 中午${midday_quantity}对`
                        if (midday_actual >= midday_quantity) {
                            // actualDetails += ' 中午已完成'
                            noCount = noCount + midday_quantity
                        }
                        // actualDetails += ` 中午已完成${midday_actual}对`
                        noCount = noCount + midday_actual
                    }
                    if (evening_quantity > 0) {
                        quantityTotal += evening_quantity
                        // details += ` 晚上${evening_quantity}对`
                        if (evening_actual >= evening_quantity) {
                            // actualDetails += ' 晚上已完成'
                            noCount = noCount + evening_quantity
                        }
                        // actualDetails += ` 晚上已完成${evening_actual}对`
                        noCount = noCount + evening_actual

                    }
                    // this.contentDetails = `一周${quantityTotal}对 ${details}`
                    // this.contentOne = actualDetails
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
                        // details += `早上${morning_quantity}次`
                        if (morning_actual >= morning_quantity) {
                            // actualDetails += '早上已完成'
                            noCount = noCount + morning_quantity
                        }
                        // actualDetails += `早上已完成${morning_actual}次`
                        noCount = noCount + morning_actual
                    }
                    if (midday_quantity > 0) {
                        quantityTotal += midday_quantity
                        // details += ` 中午${midday_quantity}次`
                        if (midday_actual >= midday_quantity) {
                            // actualDetails += ' 中午已完成'
                            noCount = noCount + midday_quantity
                        }
                        // actualDetails += ` 中午已完成${midday_actual}次`
                        noCount = noCount + midday_actual
                    }
                    if (evening_quantity > 0) {
                        quantityTotal += evening_quantity
                        // details += ` 晚上${evening_quantity}次`
                        if (midday_actual >= evening_quantity) {
                            // actualDetails += ' 晚上已完成'
                            noCount = noCount + evening_quantity
                        }
                        // actualDetails += ` 晚上已完成${evening_actual}次`
                        noCount = noCount + evening_actual
                    }
                    if (beforeSleep_quantity > 0) {
                        quantityTotal += beforeSleep_quantity
                        // details += ` 睡前${beforeSleep_quantity}次`
                        if (beforeSleep_actual >= beforeSleep_quantity) {
                            // actualDetails += ' 睡前已完成'
                            noCount = noCount + beforeSleep_quantity
                        }
                        // actualDetails += ` 睡前已完成${beforeSleep_actual}次`
                        noCount = noCount + beforeSleep_actual
                    }
                    // this.contentDetails = `一周${quantityTotal}次 ${details}`
                    // this.contentOne = actualDetails
                    allCount += quantityTotal
                }
                measurePercent = noCount / allCount
                return measurePercent
            }
            break
    }
}
